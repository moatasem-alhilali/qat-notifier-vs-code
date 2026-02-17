import * as vscode from 'vscode';
import { Logger } from '../core/logger';
import { NotificationLevel } from '../rules/models';

export class NotificationService {
	private lastNotificationAt = 0;
	private globalCooldownMs: number;

	constructor(private readonly logger: Logger, globalCooldownMs: number) {
		this.globalCooldownMs = globalCooldownMs;
	}

	setGlobalCooldownMs(ms: number): void {
		this.globalCooldownMs = ms;
		this.logger.info(`Global cooldown updated: ${ms}ms`);
	}

	notify(level: NotificationLevel, message: string): boolean {
		if (!message.trim()) {
			this.logger.warn('Skipped notification with empty message.');
			return false;
		}
		const now = Date.now();
		const sinceLast = now - this.lastNotificationAt;
		if (this.globalCooldownMs > 0 && sinceLast < this.globalCooldownMs) {
			this.logger.debug(`Global cooldown active (${sinceLast}ms < ${this.globalCooldownMs}ms).`);
			return false;
		}

		switch (level) {
			case 'info':
				void vscode.window.showInformationMessage(message);
				break;
			case 'warning':
				void vscode.window.showWarningMessage(message);
				break;
			case 'error':
				void vscode.window.showErrorMessage(message);
				break;
			default:
				void vscode.window.showInformationMessage(message);
				break;
		}

		this.lastNotificationAt = now;
		this.logger.info(`Notification shown (${level}): ${message}`);
		return true;
	}
}
