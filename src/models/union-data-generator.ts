import * as vscode from 'vscode';
import { DartCode } from './dart-code';

export class UnionDataGenerator implements vscode.CodeActionProvider {
    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken,
    ): vscode.ProviderResult<Array<vscode.CodeAction | vscode.Command>> {
        const generateUnionClassAction = this.generateUnionClass(document, range);

        if (generateUnionClassAction === null) {
            return [];
        }

        return [
            generateUnionClassAction,
        ];
    }

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.RefactorRewrite
    ];

    private generateUnionClass(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction | null {
        if (!this.startsWithClassSyntax(document, range)) {
            return null;
        }

        const command = this.buildCommandTitle(document, range);
        const fix = new vscode.CodeAction(command, vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();
        const text = this.getText(document, range);
        const dartCode = DartCode.fromString(text)?.toDartCode();

        if (!dartCode) {
            return null;
        }

        // Marking a single fix as `preferred` means that users can apply it with a
        // single keyboard shortcut using the `Auto Fix` command.
        fix.isPreferred = true;

        fix.edit.insert(document.uri, new vscode.Position((document.lineCount + 1), 0), dartCode.join(' + '));

        return fix;
    }

    private startsWithClassSyntax(document: vscode.TextDocument, range: vscode.Range): boolean {
        const validText = /^\s*(abstract\s+class\s+|class\s+|enum\s+)([A-Z_$][A-Za-z0-9_$]+)(.*{.*$|^}$|.*}$)/gm;
        const textLine = document.lineAt(range.start.line).text;
        return !textLine.match(validText) ? false : true;
    }

    private buildCommandTitle(document: vscode.TextDocument, range: vscode.Range): string {
        const textLine = document.lineAt(range.start.line).text;
        return textLine.trim().startsWith('enum ') ? 'Generate Enum Union' : 'Generate Union Class';
    }

    private getText(document: vscode.TextDocument, range: vscode.Range): string {
        const start = document.lineAt(range.start).range.start;
        const end = document.lineAt(document.lineCount - 1).range.end;
        const textRange = new vscode.Range(start, end);
        return document.getText(textRange);
    }
}