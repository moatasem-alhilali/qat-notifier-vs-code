import * as vscode from 'vscode';
import { Logger } from '../core/logger';

export interface DocumentScanResult {
	text: string;
	isTruncated: boolean;
	scannedChars: number;
	totalChars: number;
}

export class DocumentScanner {
	constructor(private readonly logger: Logger) {}

	scan(document: vscode.TextDocument, maxChars: number): DocumentScanResult {
		const lastLine = document.lineAt(Math.max(document.lineCount - 1, 0));
		const totalChars = document.offsetAt(lastLine.range.end);
		const limit = Math.min(maxChars, totalChars);
		const endPosition = document.positionAt(limit);
		const text = document.getText(new vscode.Range(new vscode.Position(0, 0), endPosition));
		const result: DocumentScanResult = {
			text,
			isTruncated: totalChars > maxChars,
			scannedChars: text.length,
			totalChars,
		};
		this.logger.debug(
			`Scanned ${result.scannedChars}/${result.totalChars} chars for ${document.uri.toString()}`,
		);
		return result;
	}
}
