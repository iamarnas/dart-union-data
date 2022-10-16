// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {
	DartClassDataProvider,
	DartCodeActionProvider,
	DartEnumDataProvider,
	GENERATE_COMMAND,
	UPDATE_COMMAND,
	UPDATE_ENUM_COMMAND
} from './code-actions';
import { DartDiagnosticCodeActionProvider, subscribeToDartLanguageDocumentChanges } from './diagnostics';
import { config } from './models/config';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "dart-union-data" is now active!');

	console.log(config.lineLength);

	vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
		console.log('changed: ', document.fileName);
	});

	const actions = vscode.languages.registerCodeActionsProvider({
		scheme: 'file',
		language: 'dart',
	},
		new DartCodeActionProvider(), {
		providedCodeActionKinds: DartCodeActionProvider.providedCodeActionKinds,
	});

	context.subscriptions.push(
		vscode.commands.registerCommand(UPDATE_COMMAND, async (arg) => {
			if (arg instanceof DartClassDataProvider) {
				await arg.updateChanges();
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(GENERATE_COMMAND, async (arg) => {
			if (arg instanceof DartClassDataProvider) {
				await arg.generateData();
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(UPDATE_ENUM_COMMAND, async (arg) => {
			if (arg instanceof DartEnumDataProvider) {
				await arg.updateChanges();
			}
		})
	);

	const dartCodeDiagnostics = vscode.languages.createDiagnosticCollection('dart_code_collection');

	context.subscriptions.push(dartCodeDiagnostics);

	subscribeToDartLanguageDocumentChanges(context, dartCodeDiagnostics);

	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('dart', new DartDiagnosticCodeActionProvider(), {
			providedCodeActionKinds: DartDiagnosticCodeActionProvider.providedCodeActionKinds
		})
	);

	context.subscriptions.push(actions);
}

// this method is called when your extension is deactivated
export function deactivate() { }
