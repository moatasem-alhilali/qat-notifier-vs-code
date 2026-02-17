import * as vscode from 'vscode';
import { getConfig, isConfigChanged } from './core/config';
import { Logger } from './core/logger';
import { DiagnosticsService } from './analysis/DiagnosticsService';
import { DocumentScanner } from './analysis/DocumentScanner';
import { EditorContext } from './editor/EditorContext';
import { EditorEvents } from './editor/EditorEvents';
import { IdleTracker } from './editor/IdleTracker';
import { RulesService } from './rules/RulesService';
import { RuleEngine } from './rules/RuleEngine';
import { NotificationService } from './ui/NotificationService';

export function activate(context: vscode.ExtensionContext): void {
	const logger = new Logger('QAT Notifier');
	const config = getConfig();

	const diagnosticsService = new DiagnosticsService(logger);
	const notificationService = new NotificationService(logger, config.globalCooldownMs);
	const documentScanner = new DocumentScanner(logger);
	const editorContext = new EditorContext(documentScanner, logger, config);
	const idleTracker = new IdleTracker(config.idleMs, logger);
	const rulesService = new RulesService(config, logger);
	const ruleEngine = new RuleEngine(
		rulesService,
		diagnosticsService,
		notificationService,
		editorContext,
		idleTracker,
		logger,
		config,
	);
	const editorEvents = new EditorEvents(editorContext, ruleEngine, idleTracker, logger);

	context.subscriptions.push(logger, idleTracker, rulesService, ruleEngine);
	editorEvents.register(context.subscriptions);

	const reloadCommand = vscode.commands.registerCommand('qat-notifier.reloadRules', async () => {
		await rulesService.reload();
	});
	context.subscriptions.push(reloadCommand);

	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (!isConfigChanged(event)) {
				return;
			}
			const newConfig = getConfig();
			editorContext.refreshConfig(newConfig);
			idleTracker.setIdleMs(newConfig.idleMs);
			notificationService.setGlobalCooldownMs(newConfig.globalCooldownMs);
			rulesService.updateConfig(newConfig);
			ruleEngine.updateConfig(newConfig);
			if (event.affectsConfiguration('qat.rulesPath')) {
				void rulesService.reload();
			}
		}),
	);

	editorContext.updateActiveEditor(vscode.window.activeTextEditor);
	if (vscode.window.activeTextEditor?.document) {
		void ruleEngine.handleTrigger('onOpen', { document: vscode.window.activeTextEditor.document });
	}

	void rulesService.reload();
}

export function deactivate(): void {}
