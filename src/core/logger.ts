import * as vscode from 'vscode';

export class Logger implements vscode.Disposable {
	private readonly channel: vscode.OutputChannel;

	constructor(name: string) {
		this.channel = vscode.window.createOutputChannel(name);
	}

	info(message: string): void {
		this.append('INFO', message);
	}

	warn(message: string): void {
		this.append('WARN', message);
	}

	error(message: string): void {
		this.append('ERROR', message);
	}

	debug(message: string): void {
		this.append('DEBUG', message);
	}

	show(preserveFocus = true): void {
		this.channel.show(preserveFocus);
	}

	dispose(): void {
		this.channel.dispose();
	}

	private append(level: string, message: string): void {
		const timestamp = new Date().toISOString();
		this.channel.appendLine(`[${timestamp}] [${level}] ${message}`);
	}
}
