export type RuleTrigger = 'onOpen' | 'onSave' | 'onType' | 'onIdle' | 'interval';

export type RuleCheckType = 'diagnostics' | 'dirtyIdle' | 'always';
export type DiagnosticsMode = 'errors' | 'warnings' | 'clean';
export type NotificationLevel = 'info' | 'warning' | 'error';

export interface RuleWhen {
	languageId?: string[];
	fileGlob?: string;
}

export interface RuleCheck {
	type: RuleCheckType;
	mode?: DiagnosticsMode;
	idleMs?: number;
}

export interface RuleNotify {
	level: NotificationLevel;
	messages: string[];
}

export interface Rule {
	id: string;
	enabled: boolean;
	trigger: RuleTrigger;
	when?: RuleWhen;
	check: RuleCheck;
	notify: RuleNotify;
	cooldownMs?: number;
}
