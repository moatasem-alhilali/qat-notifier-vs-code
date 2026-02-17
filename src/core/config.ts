import * as vscode from 'vscode';

export const CONFIG_SECTION = 'qat';

export interface QatConfig {
	enabled: boolean;
	rulesPath: string;
	globalCooldownMs: number;
	maxScanChars: number;
	idleMs: number;
}

const DEFAULTS: QatConfig = {
	enabled: true,
	rulesPath: '.vscode/qat-rules.json',
	globalCooldownMs: 15000,
	maxScanChars: 20000,
	idleMs: 120000,
};

export function getConfig(): QatConfig {
	const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
	return {
		enabled: config.get<boolean>('enabled', DEFAULTS.enabled),
		rulesPath: config.get<string>('rulesPath', DEFAULTS.rulesPath),
		globalCooldownMs: config.get<number>('globalCooldownMs', DEFAULTS.globalCooldownMs),
		maxScanChars: config.get<number>('maxScanChars', DEFAULTS.maxScanChars),
		idleMs: config.get<number>('idleMs', DEFAULTS.idleMs),
	};
}

export function isConfigChanged(event: vscode.ConfigurationChangeEvent): boolean {
	return event.affectsConfiguration(CONFIG_SECTION);
}
