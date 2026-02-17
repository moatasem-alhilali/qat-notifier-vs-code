import * as vscode from 'vscode';
import { DocumentScanner } from '../analysis/DocumentScanner';
import { QatConfig } from '../core/config';
import { Logger } from '../core/logger';
import { EditorSnapshot } from '../core/types';

export class EditorContext {
	private activeEditor?: vscode.TextEditor;
	private activeDocument?: vscode.TextDocument;
	private config: QatConfig;

	constructor(
		private readonly scanner: DocumentScanner,
		private readonly logger: Logger,
		config: QatConfig,
	) {
		this.config = config;
	}

	updateActiveEditor(editor?: vscode.TextEditor): void {
		this.activeEditor = editor;
		this.activeDocument = editor?.document;
		if (editor?.document) {
			this.logger.debug(`Active editor set to ${editor.document.uri.toString()}`);
		}
	}

	updateDocument(document: vscode.TextDocument): void {
		if (this.activeDocument?.uri.toString() === document.uri.toString()) {
			this.activeDocument = document;
		}
	}

	refreshConfig(config: QatConfig): void {
		this.config = config;
	}

	getSnapshot(preferredDocument?: vscode.TextDocument, includeTextSample = false): EditorSnapshot {
		const document = preferredDocument ?? this.activeDocument ?? this.activeEditor?.document;
		if (!document) {
			return {
				isDirty: false,
				isUntitled: false,
			};
		}

		const scan = includeTextSample ? this.scanner.scan(document, this.config.maxScanChars) : undefined;
		return {
			editor: this.activeEditor,
			document,
			uri: document.uri,
			fileName: document.fileName,
			languageId: document.languageId,
			relativePath: this.getRelativePath(document.uri),
			isDirty: document.isDirty,
			isUntitled: document.isUntitled,
			textSample: scan?.text,
			isSampleTruncated: scan?.isTruncated,
		};
	}

	private getRelativePath(uri: vscode.Uri): string | undefined {
		const folder = vscode.workspace.getWorkspaceFolder(uri);
		if (!folder) {
			return undefined;
		}
		return vscode.workspace.asRelativePath(uri, false);
	}
}
