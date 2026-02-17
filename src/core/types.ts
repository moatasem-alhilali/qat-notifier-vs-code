import * as vscode from 'vscode';

export type DiagnosticsState = 'errors' | 'warnings' | 'clean';

export interface EditorSnapshot {
	editor?: vscode.TextEditor;
	document?: vscode.TextDocument;
	uri?: vscode.Uri;
	fileName?: string;
	languageId?: string;
	relativePath?: string;
	isDirty: boolean;
	isUntitled: boolean;
	textSample?: string;
	isSampleTruncated?: boolean;
}
