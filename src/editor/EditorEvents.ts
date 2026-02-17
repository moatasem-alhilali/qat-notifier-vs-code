import * as vscode from 'vscode';
import { throttle } from '../core/utils/throttle';
import { Logger } from '../core/logger';
import { EditorContext } from './EditorContext';
import { IdleTracker } from './IdleTracker';
import { RuleEngine } from '../rules/RuleEngine';

export class EditorEvents {
	private readonly throttledTypeHandler: (event: vscode.TextDocumentChangeEvent) => void;

	constructor(
		private readonly editorContext: EditorContext,
		private readonly ruleEngine: RuleEngine,
		private readonly idleTracker: IdleTracker,
		private readonly logger: Logger,
	) {
		this.throttledTypeHandler = throttle(
			(event: vscode.TextDocumentChangeEvent) => this.handleType(event),
			800,
		);
	}

	register(disposables: vscode.Disposable[]): void {
		disposables.push(
			vscode.window.onDidChangeActiveTextEditor((editor) => {
				this.editorContext.updateActiveEditor(editor);
				this.idleTracker.markActivity('activeEditorChange');
				if (editor?.document) {
					void this.ruleEngine.handleTrigger('onOpen', { document: editor.document });
				}
			}),
			vscode.workspace.onDidSaveTextDocument((document) => {
				this.editorContext.updateDocument(document);
				this.idleTracker.markActivity('documentSave');
				if (this.isActiveDocument(document)) {
					void this.ruleEngine.handleTrigger('onSave', { document });
				}
			}),
			vscode.workspace.onDidChangeTextDocument((event) => {
				this.editorContext.updateDocument(event.document);
				this.idleTracker.markActivity('documentChange');
				if (this.isActiveDocument(event.document)) {
					this.throttledTypeHandler(event);
				}
			}),
			this.idleTracker.onDidIdle((idleForMs) => {
				this.logger.debug(`Idle event fired after ${idleForMs}ms`);
				const document = vscode.window.activeTextEditor?.document;
				void this.ruleEngine.handleTrigger('onIdle', { document, idleDurationMs: idleForMs });
			}),
		);
	}

	private handleType(event: vscode.TextDocumentChangeEvent): void {
		void this.ruleEngine.handleTrigger('onType', { document: event.document });
	}

	private isActiveDocument(document: vscode.TextDocument): boolean {
		const active = vscode.window.activeTextEditor?.document;
		return !!active && active.uri.toString() === document.uri.toString();
	}
}
