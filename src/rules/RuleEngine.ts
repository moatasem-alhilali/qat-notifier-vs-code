import * as path from 'path';
import * as vscode from 'vscode';
import { DiagnosticsService } from '../analysis/DiagnosticsService';
import { QatConfig } from '../core/config';
import { Logger } from '../core/logger';
import { EditorSnapshot } from '../core/types';
import { EditorContext } from '../editor/EditorContext';
import { IdleTracker } from '../editor/IdleTracker';
import { NotificationService } from '../ui/NotificationService';
import { RulesService } from './RulesService';
import { Rule, RuleTrigger } from './models';
import { diagnosticsMatcher } from './matchers/diagnosticsMatcher';
import { dirtyIdleMatcher } from './matchers/dirtyIdleMatcher';
import { alwaysMatcher } from './matchers/alwaysMatcher';

interface TriggerOptions {
	document?: vscode.TextDocument;
	idleDurationMs?: number;
	ruleId?: string;
}

export class RuleEngine implements vscode.Disposable {
	private config: QatConfig;
	private readonly lastRuleFiredAt = new Map<string, number>();
	private intervalTimers: NodeJS.Timeout[] = [];

	constructor(
		private readonly rulesService: RulesService,
		private readonly diagnosticsService: DiagnosticsService,
		private readonly notificationService: NotificationService,
		private readonly editorContext: EditorContext,
		private readonly idleTracker: IdleTracker,
		private readonly logger: Logger,
		config: QatConfig,
	) {
		this.config = config;
		this.rulesService.onDidChange((rules) => this.resetIntervals(rules));
	}

	updateConfig(config: QatConfig): void {
		this.config = config;
		this.resetIntervals(this.rulesService.getRules());
	}

	dispose(): void {
		this.clearIntervals();
	}

	async handleTrigger(trigger: RuleTrigger, options?: TriggerOptions): Promise<void> {
		if (!this.config.enabled) {
			this.logger.debug('QAT Notifier is disabled.');
			return;
		}

		const snapshot = this.editorContext.getSnapshot(options?.document);
		const rules = this.getRulesForTrigger(trigger, options?.ruleId);
		if (!rules.length) {
			return;
		}

		const idleDurationMs = options?.idleDurationMs ?? this.idleTracker.getIdleDurationMs();
		const now = Date.now();

		for (const rule of rules) {
			if (!rule.enabled) {
				this.logger.debug(`Rule ${rule.id} is disabled.`);
				continue;
			}

			if (!this.matchesWhen(rule, snapshot)) {
				this.logger.debug(`Rule ${rule.id} skipped due to when conditions.`);
				continue;
			}

			if (!this.isRuleOffCooldown(rule, now)) {
				continue;
			}

			const matched = this.evaluateRule(rule, snapshot, idleDurationMs);
			this.logger.debug(`Rule ${rule.id} evaluated: ${matched ? 'matched' : 'not matched'}.`);
			if (!matched) {
				continue;
			}

			const message = this.pickMessage(rule.notify.messages);
			const sent = this.notificationService.notify(rule.notify.level, message);
			if (sent) {
				this.lastRuleFiredAt.set(rule.id, now);
			}
			return;
		}
	}

	private getRulesForTrigger(trigger: RuleTrigger, ruleId?: string): Rule[] {
		const rules = this.rulesService.getRules().filter((rule) => rule.trigger === trigger);
		if (ruleId) {
			return rules.filter((rule) => rule.id === ruleId);
		}
		return rules;
	}

	private evaluateRule(rule: Rule, snapshot: EditorSnapshot, idleDurationMs: number): boolean {
		switch (rule.check.type) {
			case 'diagnostics':
				return diagnosticsMatcher(rule.check, snapshot.document, this.diagnosticsService);
			case 'dirtyIdle':
				return dirtyIdleMatcher(rule.check, snapshot, idleDurationMs, this.config.idleMs);
			case 'always':
				return alwaysMatcher(rule.check);
			default:
				return false;
		}
	}

	private matchesWhen(rule: Rule, snapshot: EditorSnapshot): boolean {
		if (!snapshot.document) {
			return !rule.when?.languageId?.length && !rule.when?.fileGlob;
		}
		if (rule.when?.languageId?.length) {
			if (!snapshot.languageId || !rule.when.languageId.includes(snapshot.languageId)) {
				return false;
			}
		}
		if (rule.when?.fileGlob) {
			const target = snapshot.relativePath ?? snapshot.fileName;
			if (!target) {
				return false;
			}
			if (!this.matchesGlob(rule.when.fileGlob, target)) {
				return false;
			}
		}
		return true;
	}

	private matchesGlob(pattern: string, target: string): boolean {
		const normalizedTarget = this.normalizePath(target);
		const normalizedPattern = this.normalizePath(pattern);
		const usesPath = normalizedPattern.includes('/');
		const subject = usesPath ? normalizedTarget : path.posix.basename(normalizedTarget);
		const regex = this.globToRegExp(normalizedPattern);
		return regex.test(subject);
	}

	private globToRegExp(glob: string): RegExp {
		let regex = '^';
		let i = 0;
		while (i < glob.length) {
			const char = glob[i];
			if (char === '*') {
				if (glob[i + 1] === '*') {
					i += 2;
					regex += '.*';
					continue;
				}
				i += 1;
				regex += '[^/]*';
				continue;
			}
			if (char === '?') {
				i += 1;
				regex += '.';
				continue;
			}
			if ('+.^$|()[]{}'.includes(char)) {
				regex += `\\${char}`;
			} else {
				regex += char;
			}
			i += 1;
		}
		regex += '$';
		return new RegExp(regex);
	}

	private normalizePath(value: string): string {
		return value.replace(/\\/g, '/');
	}

	private isRuleOffCooldown(rule: Rule, now: number): boolean {
		const cooldownMs = rule.cooldownMs ?? 0;
		if (cooldownMs <= 0) {
			return true;
		}
		const lastFired = this.lastRuleFiredAt.get(rule.id) ?? 0;
		const sinceLast = now - lastFired;
		if (sinceLast < cooldownMs) {
			this.logger.debug(`Rule ${rule.id} cooldown (${sinceLast}ms < ${cooldownMs}ms).`);
			return false;
		}
		return true;
	}

	private pickMessage(messages: string[]): string {
		if (!messages.length) {
			return '';
		}
		const index = Math.floor(Math.random() * messages.length);
		return messages[index];
	}

	private resetIntervals(rules: Rule[]): void {
		this.clearIntervals();
		const intervalRules = rules.filter((rule) => rule.trigger === 'interval');
		for (const rule of intervalRules) {
			const intervalMs = this.resolveIntervalMs(rule);
			this.logger.info(`Scheduling interval rule ${rule.id} every ${intervalMs}ms.`);
			const timer = setInterval(() => {
				void this.handleTrigger('interval', { ruleId: rule.id });
			}, intervalMs);
			this.intervalTimers.push(timer);
		}
	}

	private resolveIntervalMs(rule: Rule): number {
		const fallback = Math.max(this.config.globalCooldownMs, 60000);
		return rule.cooldownMs && rule.cooldownMs > 0 ? rule.cooldownMs : fallback;
	}

	private clearIntervals(): void {
		for (const timer of this.intervalTimers) {
			clearInterval(timer);
		}
		this.intervalTimers = [];
	}
}
