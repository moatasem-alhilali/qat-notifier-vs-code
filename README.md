# QAT مقيل

![QAT Maqeel](public/images/readme_header.png)

**الشعار:** “هيا نكود واحنا مكيفين؟”

QAT مقيل هو امتداد VS Code احترافي يقدّم إشعارات عربية ساخرة ومحفزة للمبرمجين بناءً على تشخيصات الملف ونشاطك داخل المحرر. النظام قائم على قواعد، قابل للتخصيص، ومع تبريد يمنع الإزعاج.

## Highlights

- Rule engine with per‑rule cooldowns and global cooldown
- Diagnostics‑aware messages (errors, warnings, clean)
- Dirty + idle reminders
- Interval reminders for motivation/roast
- Live rule reload via command
- OutputChannel logging (`QAT Notifier`)

## How It Works

- Events (open/save/type/idle/interval) trigger rule evaluation.
- Matching rules pick a random message and respect cooldowns.
- If no workspace rules file exists, built‑in defaults are used automatically.

## Architecture

`src/extension.ts` only wires dependencies and registers events/commands.

- `src/core/config.ts`: settings
- `src/core/logger.ts`: OutputChannel logger
- `src/core/types.ts`: shared types
- `src/core/utils/*`: throttle/debounce
- `src/editor/EditorContext.ts`: current editor snapshot
- `src/editor/EditorEvents.ts`: VS Code event wiring
- `src/editor/IdleTracker.ts`: idle detection
- `src/analysis/DiagnosticsService.ts`: diagnostics evaluation
- `src/analysis/DocumentScanner.ts`: bounded scans for large files
- `src/rules/models.ts`: rule models
- `src/rules/RulesService.ts`: load/validate rules
- `src/rules/RuleEngine.ts`: rule evaluation + cooldowns + intervals
- `src/rules/matchers/*`: rule matchers
- `src/ui/NotificationService.ts`: notifications + global cooldown

## Rules

Default rules are built‑in. You can override them by creating a rules file at:

- `.vscode/qat-rules.json`

Rule shape:

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
- `diagnostics` uses `vscode.languages.getDiagnostics`.
- `dirtyIdle` requires a dirty document and idle time (`idleMs` or `qat.idleMs`).
- `interval` uses `cooldownMs` as its timer, otherwise `max(qat.globalCooldownMs, 60000)`.

## Commands

- `QAT: Reload Rules` (`qat-notifier.reloadRules`)

## Settings

- `qat.enabled`: enable/disable the extension
- `qat.rulesPath`: rules file path (relative or absolute)
- `qat.globalCooldownMs`: global notification cooldown
- `qat.maxScanChars`: max characters scanned from a document
- `qat.idleMs`: idle threshold in milliseconds

## Quick Start

1. Install and open any workspace.
2. Optional: create `.vscode/qat-rules.json` to customize messages.
3. Run `QAT: Reload Rules` after edits.
4. Save, type, or go idle to see notifications.

## Logs

Open the Output panel and select `QAT Notifier` to see rule evaluation and cooldown decisions.

## Screens

![Marketplace Preview](public/images/marketplace.png)
