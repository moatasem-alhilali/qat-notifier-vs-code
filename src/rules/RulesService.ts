import * as path from 'path';
import * as vscode from 'vscode';
import { QatConfig } from '../core/config';
import { Logger } from '../core/logger';
import { Rule, RuleCheckType, RuleTrigger, NotificationLevel, DiagnosticsMode } from './models';
import { DEFAULT_RULES } from './seedRules';

const VALID_TRIGGERS: RuleTrigger[] = ['onOpen', 'onSave', 'onType', 'onIdle', 'interval'];
const VALID_CHECKS: RuleCheckType[] = ['diagnostics', 'dirtyIdle', 'always'];
const VALID_LEVELS: NotificationLevel[] = ['info', 'warning', 'error'];
const VALID_DIAGNOSTICS_MODES: DiagnosticsMode[] = ['errors', 'warnings', 'clean'];

export class RulesService implements vscode.Disposable {
	private rules: Rule[] = [];
	private config: QatConfig;
	private readonly onDidChangeEmitter = new vscode.EventEmitter<Rule[]>();

	constructor(config: QatConfig, private readonly logger: Logger) {
		this.config = config;
	}

	get onDidChange(): vscode.Event<Rule[]> {
		return this.onDidChangeEmitter.event;
	}

	updateConfig(config: QatConfig): void {
		this.config = config;
	}

	getRules(): Rule[] {
		return this.rules;
	}

	async reload(): Promise<Rule[]> {
		const rules = await this.loadRules();
		this.rules = rules;
		this.onDidChangeEmitter.fire(rules);
		this.logger.info(`Loaded ${rules.length} rule(s).`);
		return rules;
	}

	dispose(): void {
		this.onDidChangeEmitter.dispose();
	}

	private async loadRules(): Promise<Rule[]> {
		const uri = this.resolveRulesUri();
		if (!uri) {
			this.logger.warn('No workspace folder found. Using built-in default rules.');
			return DEFAULT_RULES;
		}

		const exists = await this.fileExists(uri);
		if (!exists) {
			this.logger.info(`Rules file not found at ${uri.fsPath}. Using built-in default rules.`);
			return DEFAULT_RULES;
		}

		try {
			const data = await vscode.workspace.fs.readFile(uri);
			const rawText = Buffer.from(data).toString('utf8');
			const parsed = JSON.parse(rawText) as unknown;
			const rawRules = this.extractRules(parsed);
			if (!rawRules) {
				this.logger.warn(`Rules file has no rules array: ${uri.fsPath}. Using defaults.`);
				return DEFAULT_RULES;
			}
			const normalized = this.normalizeRules(rawRules, uri);
			if (!normalized.length) {
				this.logger.warn(`No valid rules in ${uri.fsPath}. Using defaults.`);
				return DEFAULT_RULES;
			}
			return normalized;
		} catch (error) {
			this.logger.error(`Failed to load rules from ${uri.fsPath}: ${String(error)}. Using defaults.`);
			return DEFAULT_RULES;
		}
	}

	private async fileExists(uri: vscode.Uri): Promise<boolean> {
		try {
			await vscode.workspace.fs.stat(uri);
			return true;
		} catch {
			return false;
		}
	}

	private resolveRulesUri(): vscode.Uri | undefined {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			return undefined;
		}
		const rulesPath = this.config.rulesPath.trim();
		if (!rulesPath) {
			return undefined;
		}
		if (path.isAbsolute(rulesPath)) {
			return vscode.Uri.file(rulesPath);
		}
		return vscode.Uri.joinPath(workspaceFolder.uri, rulesPath);
	}

	private extractRules(parsed: unknown): unknown[] | undefined {
		if (Array.isArray(parsed)) {
			return parsed;
		}
		if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { rules?: unknown[] }).rules)) {
			return (parsed as { rules: unknown[] }).rules;
		}
		return undefined;
	}

	private normalizeRules(rawRules: unknown[], uri: vscode.Uri): Rule[] {
		const normalized: Rule[] = [];

		for (const raw of rawRules) {
			if (!raw || typeof raw !== 'object') {
				this.logger.warn('Skipping invalid rule (not an object).');
				continue;
			}

			const rule = raw as Partial<Rule>;
			if (!rule.id || typeof rule.id !== 'string') {
				this.logger.warn('Skipping rule with missing id.');
				continue;
			}
			if (!rule.trigger || !VALID_TRIGGERS.includes(rule.trigger)) {
				this.logger.warn(`Skipping rule ${rule.id}: invalid trigger.`);
				continue;
			}
			if (!rule.check || !VALID_CHECKS.includes(rule.check.type)) {
				this.logger.warn(`Skipping rule ${rule.id}: invalid check type.`);
				continue;
			}
			if (!rule.notify || !VALID_LEVELS.includes(rule.notify.level)) {
				this.logger.warn(`Skipping rule ${rule.id}: invalid notification level.`);
				continue;
			}
			const messages = Array.isArray(rule.notify.messages)
				? rule.notify.messages
						.filter((msg): msg is string => typeof msg === 'string')
						.map((msg) => msg.trim())
						.filter((msg) => msg.length > 0)
				: [];
			if (!messages.length) {
				this.logger.warn(`Skipping rule ${rule.id}: missing messages.`);
				continue;
			}

			const normalizedRule: Rule = {
				id: rule.id,
				enabled: typeof rule.enabled === 'boolean' ? rule.enabled : true,
				trigger: rule.trigger,
				when: {
					languageId: Array.isArray(rule.when?.languageId)
						? rule.when?.languageId.filter((lang): lang is string => typeof lang === 'string')
						: undefined,
					fileGlob: typeof rule.when?.fileGlob === 'string' ? rule.when.fileGlob : undefined,
				},
				check: {
					type: rule.check.type,
					mode: rule.check.mode && VALID_DIAGNOSTICS_MODES.includes(rule.check.mode) ? rule.check.mode : undefined,
					idleMs: typeof rule.check.idleMs === 'number' ? rule.check.idleMs : undefined,
				},
				notify: {
					level: rule.notify.level,
					messages,
				},
				cooldownMs: typeof rule.cooldownMs === 'number' ? rule.cooldownMs : undefined,
			};

			normalized.push(normalizedRule);
		}

		if (!normalized.length) {
			this.logger.warn(`No valid rules loaded from ${uri.fsPath}.`);
		}

		return normalized;
	}
}
