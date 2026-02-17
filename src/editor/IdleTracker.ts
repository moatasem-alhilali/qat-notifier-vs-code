import * as vscode from 'vscode';
import { Logger } from '../core/logger';

export class IdleTracker implements vscode.Disposable {
	private idleMs: number;
	private lastActivityAt: number;
	private timer: NodeJS.Timeout | undefined;
	private readonly onDidIdleEmitter = new vscode.EventEmitter<number>();

	constructor(idleMs: number, private readonly logger: Logger) {
		this.idleMs = idleMs;
		this.lastActivityAt = Date.now();
		this.schedule();
	}

	get onDidIdle(): vscode.Event<number> {
		return this.onDidIdleEmitter.event;
	}

	markActivity(reason?: string): void {
		this.lastActivityAt = Date.now();
		if (reason) {
			this.logger.debug(`Activity detected: ${reason}`);
		}
		this.schedule();
	}

	getIdleDurationMs(): number {
		return Date.now() - this.lastActivityAt;
	}

	isIdle(thresholdMs: number): boolean {
		return this.getIdleDurationMs() >= thresholdMs;
	}

	setIdleMs(idleMs: number): void {
		this.idleMs = idleMs;
		this.logger.info(`Idle threshold updated: ${idleMs}ms`);
		this.schedule();
	}

	dispose(): void {
		if (this.timer) {
			clearTimeout(this.timer);
		}
		this.onDidIdleEmitter.dispose();
	}

	private schedule(): void {
		if (this.timer) {
			clearTimeout(this.timer);
		}
		const remaining = Math.max(this.idleMs - this.getIdleDurationMs(), 0);
		this.timer = setTimeout(() => {
			const idleFor = this.getIdleDurationMs();
			if (idleFor >= this.idleMs) {
				this.logger.debug(`Idle detected after ${idleFor}ms`);
				this.onDidIdleEmitter.fire(idleFor);
			}
			this.schedule();
		}, remaining || this.idleMs);
	}
}
