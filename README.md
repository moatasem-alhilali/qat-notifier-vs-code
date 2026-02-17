# QAT Notifier

QAT Notifier is a rule-driven, humorous, Arabic roast-style notification system for developers. It reacts to diagnostics, editor activity, and idle time to drop playful reminders without spamming.

## Features

- Rule engine with per-rule cooldowns and a global cooldown
- Diagnostics-aware messages (errors, warnings, clean)
- Idle + dirty file reminders
- Interval reminders for general motivation
- Live reload of rules via command
- OutputChannel logging (`QAT Notifier`)

## Architecture

Core services are modular and testable. `src/extension.ts` only wires dependencies and registers events/commands.

- `src/core/`
  - `config.ts`: reads settings
  - `logger.ts`: OutputChannel logger
  - `types.ts`: shared types
  - `utils/`: throttle/debounce
- `src/editor/`
  - `EditorContext.ts`: active editor snapshot
  - `EditorEvents.ts`: VS Code event wiring
  - `IdleTracker.ts`: idle detection
- `src/analysis/`
  - `DiagnosticsService.ts`: diagnostics state evaluation
  - `DocumentScanner.ts`: bounded text scanning (`qat.maxScanChars`)
- `src/rules/`
  - `models.ts`: rule types
  - `RulesService.ts`: load/validate rules JSON
  - `RuleEngine.ts`: rule evaluation, cooldowns, interval support
  - `matchers/`: `diagnostics`, `dirtyIdle`, `always`
- `src/ui/`
  - `NotificationService.ts`: global cooldown + VS Code notifications

## Rules

Rules live at `.vscode/qat-rules.json` by default. The file is a JSON array of rules matching this shape:

```json
{
  "id": "unique-id",
  "enabled": true,
  "trigger": "onOpen" | "onSave" | "onType" | "onIdle" | "interval",
  "when": {
    "languageId": ["typescript"],
    "fileGlob": "**/*.ts"
  },
  "check": {
    "type": "diagnostics" | "dirtyIdle" | "always",
    "mode": "errors" | "warnings" | "clean",
    "idleMs": 90000
  },
  "notify": {
    "level": "info" | "warning" | "error",
    "messages": ["message 1", "message 2"]
  },
  "cooldownMs": 60000
}
```

Notes:
- `diagnostics` evaluates the active document using `vscode.languages.getDiagnostics`.
- `dirtyIdle` requires a dirty document and idle time (rule `idleMs` or `qat.idleMs`).
- `interval` rules run on a timer. The interval uses `cooldownMs` when provided, otherwise `max(qat.globalCooldownMs, 60000)`.
- If the rules file is missing, QAT Notifier auto-creates it with default rules on activation.

## Commands

- `QAT: Reload Rules` (`qat-notifier.reloadRules`)

## Settings

- `qat.enabled`: enable/disable QAT Notifier
- `qat.rulesPath`: path to the rules file (relative or absolute)
- `qat.globalCooldownMs`: global cooldown between notifications
- `qat.maxScanChars`: max characters to scan from a document
- `qat.idleMs`: idle time threshold in milliseconds

## Usage

1. Open `.vscode/qat-rules.json` and edit rules/messages.
2. Run `QAT: Reload Rules` to apply changes instantly.
3. Trigger events by saving, typing, or going idle.

## Output Logs

Open the Output panel and select `QAT Notifier` to see rule evaluation logs and cooldown decisions.
