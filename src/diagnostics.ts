import * as vscode from 'vscode';
import { DartEnumDataProvider } from './code-actions';
import { DartCodeProvider } from './code-actions/dart/dart-code-provider';
import { CodeActionValue } from './interface';

/** Code that is used to associate diagnostic entries with enum code actions. */
export const ENUM_MENTION = 'enum_class';

/** Code that is used to associate diagnostic entries with enum method actions. */
export const NOT_MATCH_ALL_ENUM_VALUES = 'not_match_all_enum_values';

/** Code that is used to associate diagnostic entries with data class code actions. */
export const CLASS_MENTION = 'data_class';

/** The main user-readable message suffix that alerts about data changes */
const DATA_CHANGES_MESSAGE = 'lacks data implementation.\nTry to update all methods with the correct variables.';

/**
 * Analyzes the text document for problems.
 * @param doc text document to analyze
 * @param codeDiagnostics diagnostic collection
 */
function refreshDiagnostics(doc: vscode.TextDocument, selection: vscode.Range, codeDiagnostics: vscode.DiagnosticCollection): void {
	const buffer: Set<DartCodeProvider> = new Set();
	const diagnostics: vscode.Diagnostic[] = [];

	for (let i = 0; i < doc.lineCount; i++) {
		const line = doc.lineAt(i);

		if (line.text.trimStart().startsWith('enum')
			|| line.text.trimStart().startsWith('class')
			|| line.text.trimStart().startsWith('abstract')) {
			buffer.add(new DartCodeProvider(doc, line.range));
		}
	}

	for (const provider of [...buffer]) {
		const enumData = provider.enum;
		const classData = provider.data;

		if (enumData !== undefined) {
			if (provider.enum?.hasChanges ?? false) {
				diagnostics.push(createEnumClassDiagnostic(provider));
				diagnostics.push(...enumData.data.replacements.map((e) => createEnumMethodDiagnostic(e, enumData)));
				diagnostics.push(...enumData.data.extension.replacements.map((e) => createEnumMethodDiagnostic(e, enumData)));
			}
		}

		if (classData !== undefined) {
			if (provider.data?.hasChanges ?? false) {
				diagnostics.push(createDataClassDiagnostic(provider));
			}
		}
	}

	codeDiagnostics.set(doc.uri, diagnostics);
}

function createEnumClassDiagnostic(provider: DartCodeProvider): vscode.Diagnostic {
	const range = provider.start.range;
	const extensionHasChanges = provider.enum?.data.extension.hasChanges ?? false;
	const dataHasChanges = provider.enum?.data.hasChanges ?? false;
	let name = provider.element?.name ?? '';

	if (dataHasChanges && extensionHasChanges) {
		name += ': enum class and extension ';
	}

	if (dataHasChanges && !extensionHasChanges) {
		name += ': enum class ';
	}

	if (!dataHasChanges && extensionHasChanges) {
		name += ': extension ';
	}

	const diagnostic = new vscode.Diagnostic(
		range,
		name + DATA_CHANGES_MESSAGE,
		vscode.DiagnosticSeverity.Warning,
	);
	diagnostic.code = ENUM_MENTION;
	return diagnostic;
}

function createEnumMethodDiagnostic(action: CodeActionValue, provider: DartEnumDataProvider): vscode.Diagnostic {
	const name = action.key.slice(0, -1);
	const insertions = [...provider.data.extension.insertions, ...provider.data.insertions]
		.map((e) => e.key.slice(e.key.lastIndexOf('.') + 1, e.key.lastIndexOf(';')))
		.join(', ');
	const removals = [...provider.data.extension.removals, ...provider.data.removals]
		.map((e) => e.text.slice(e.text.lastIndexOf('.') + 1, e.text.lastIndexOf(';')))
		.join(', ');
	const valuesToImplement = insertions.length === 0 ? '' : `\nTry adding missing values: ${insertions}.`;
	const valuesToRemove = removals.length === 0 ? '' : `\nTry to remove non existent functions: ${removals}.`;

	const diagnostic = new vscode.Diagnostic(new vscode.Range(
		new vscode.Position(action.position.line, action.value.indexOf(action.value.trimStart()[0]) + 1),
		new vscode.Position(action.position.line, action.value.split('\n')[0].length),
	),
		`Method '${name}' does not match all enum values.` + `${valuesToImplement} ${valuesToRemove}`,
		vscode.DiagnosticSeverity.Warning,
	);

	diagnostic.code = NOT_MATCH_ALL_ENUM_VALUES;

	return diagnostic;
}

function createDataClassDiagnostic(provider: DartCodeProvider): vscode.Diagnostic {
	const range = provider.start.range;
	const name = provider.element ? `${provider.element.name}: ` : '';

	const diagnostic = new vscode.Diagnostic(
		range,
		name + DATA_CHANGES_MESSAGE,
		vscode.DiagnosticSeverity.Warning,
	);
	diagnostic.code = CLASS_MENTION;
	return diagnostic;
}

export function subscribeToDartLanguageDocumentChanges(context: vscode.ExtensionContext, diagnostics: vscode.DiagnosticCollection): void {
	const editor = vscode.window.activeTextEditor;

	if (!editor || editor.document.languageId !== 'dart') return;

	refreshDiagnostics(editor.document, editor.selection, diagnostics);

	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) {
				refreshDiagnostics(editor.document, editor.selection, diagnostics);
			}
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument((e) => refreshDiagnostics(e.document, editor.selection, diagnostics))
	);

	context.subscriptions.push(
		vscode.workspace.onDidCloseTextDocument((doc) => diagnostics.delete(doc.uri))
	);
}

/**
 * Provides code actions corresponding to diagnostic problems.
 */
export class DartCodeInfo implements vscode.CodeActionProvider {
	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.QuickFix
	];

	provideCodeActions(
		document: vscode.TextDocument,
		range: vscode.Range | vscode.Selection,
		context: vscode.CodeActionContext,
		token: vscode.CancellationToken,
	): vscode.CodeAction[] {
		const provider = new DartCodeProvider(document, range);
		const enumData = provider.enum;
		const classData = provider.data;
		const enumActions = !enumData
			? []
			: context.diagnostics
				.filter((diagnostic) => diagnostic.code === ENUM_MENTION)
				.map((diagnostic) => enumData.updateCommand([enumData], [diagnostic]));
		const classDataActions = !classData
			? []
			: context.diagnostics
				.filter((diagnostic) => diagnostic.code === CLASS_MENTION)
				.map((diagnostic) => classData.updateCommand([classData], [diagnostic]));

		// for each diagnostic entry that has the matching `code`, create a code action command
		return [...enumActions, ...classDataActions];
	}
}