import * as vscode from 'vscode';
import { ClassElement, FieldElement, Element } from '../element/element';
import { DartCode } from './dart-code';
import { EnumExtensionGenerator } from './enum-generator';

export class DartCodeActionProvider implements vscode.CodeActionProvider {
    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken,
    ): vscode.ProviderResult<Array<vscode.CodeAction | vscode.Command>> {
        const generateUnionDataAction = this.generateUnionData(document, range);

        return generateUnionDataAction === null ? [] : [generateUnionDataAction];
    }

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.RefactorRewrite,
    ];

    private generateUnionData(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction | null {
        if (!this.containsClassSyntax(document, range)) {
            return null;
        }

        const text = this.getText(document, range);
        //const dartCode = DartCode.fromString(text).split();

        // if (dartCode.length < 2) {
        //     return null;
        // }

        let dartCode: string;

        try {
            dartCode = new EnumExtensionGenerator(element).generate();
        } catch (e) {
            dartCode = `${e}`;
        }

        const fix = new vscode.CodeAction('Generate Union Data', vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();
        // Marking a single fix as `preferred` means that users can apply it with a
        // single keyboard shortcut using the `Auto Fix` command.
        fix.isPreferred = true;
        fix.edit.insert(document.uri, new vscode.Position((document.lineCount + 1), 0), dartCode);

        return fix;
    }

    private containsClassSyntax(document: vscode.TextDocument, range: vscode.Range): boolean {
        const validText = /^\s*(abstract\s+class\s+|class\s+|enum\s+)([A-Z_$][A-Za-z0-9_$]+)(.*{.*$|^}$|.*}$)/g;
        const textLine = document.lineAt(range.start.line).text;

        return textLine.match(validText) !== null;
    }

    private getText(document: vscode.TextDocument, range: vscode.Range): string {
        const start = document.lineAt(range.start).range.start;
        const end = document.lineAt(document.lineCount - 1).range.end;
        const textRange = new vscode.Range(start, end);
        return document.getText(textRange);
    }
}