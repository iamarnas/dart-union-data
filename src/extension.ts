// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { GENERATE_COMMAND, UPDATE_COMMAND, UPDATE_ENUM_COMMAND } from './editors';
import { DartCodeActionProvider } from './models/dart-code-action-provider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const editor = vscode.window.activeTextEditor;

	if (!editor) return;

	const provider = new DartCodeActionProvider(editor);

	// const a = vscode.window.onDidChangeTextEditorSelection((event) => {
	// 	console.log(event.textEditor.selection);
	// });

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "dart-union-data" is now active!');

	const actions = vscode.languages.registerCodeActionsProvider({
		scheme: 'file',
		language: 'dart',
	},
		provider, {
		providedCodeActionKinds: DartCodeActionProvider.providedCodeActionKinds,
	});

	context.subscriptions.push(
		vscode.commands.registerCommand(UPDATE_COMMAND, () => provider.code.data?.updateChanges())
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(GENERATE_COMMAND, () => provider.code.data?.generateData())
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(UPDATE_ENUM_COMMAND, () => provider.code.enum?.updateChanges())
	);

	context.subscriptions.push(actions);
}

// this method is called when your extension is deactivated
export function deactivate() { }
