import * as vscode from 'vscode';
import { DiagnosticsService } from '../../analysis/DiagnosticsService';
import { DiagnosticsMode, RuleCheck } from '../models';

export function diagnosticsMatcher(
	check: RuleCheck,
	document: vscode.TextDocument | undefined,
	diagnosticsService: DiagnosticsService,
): boolean {
	if (!document) {
		return false;
	}
	const mode: DiagnosticsMode = check.mode ?? 'errors';
	const state = diagnosticsService.getDiagnosticsState(document);
	return state === mode;
}
