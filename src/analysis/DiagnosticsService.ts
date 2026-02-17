import * as vscode from 'vscode';
import { DiagnosticsState } from '../core/types';
import { Logger } from '../core/logger';

export class DiagnosticsService {
	constructor(private readonly logger: Logger) {}

	getDiagnosticsState(document: vscode.TextDocument): DiagnosticsState {
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		let hasErrors = false;
		let hasWarnings = false;

		for (const diagnostic of diagnostics) {
			switch (diagnostic.severity) {
				case vscode.DiagnosticSeverity.Error:
					hasErrors = true;
					break;
				case vscode.DiagnosticSeverity.Warning:
					hasWarnings = true;
					break;
				default:
					break;
			}
			if (hasErrors) {
				break;
			}
		}

		const state: DiagnosticsState = hasErrors ? 'errors' : hasWarnings ? 'warnings' : 'clean';
		this.logger.debug(`Diagnostics state for ${document.uri.toString()}: ${state}`);
		return state;
	}
}
