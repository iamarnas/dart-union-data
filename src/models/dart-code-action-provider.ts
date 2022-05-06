import * as vscode from 'vscode';
import { ElementBuilder } from '../element/element-builder';
import { ClassDataGenerator } from '../generators/class-data.generator';
import { EnumDataGenerator } from '../generators/enum.generator';

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
        const element = ElementBuilder.fromString(text).buildElement();

        if (element === undefined) {
            return null;
        }

        let dartCode = '';

        if (element.isEnum) {
            dartCode = new EnumDataGenerator(element).generateExtension();
        } else {
            dartCode = new ClassDataGenerator(element).generateCopyWith();
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
        const validText = /^\s*(abstract\s+class\s+|class\s+|enum\s+)([A-Z_$][A-Za-z0-9_$]+)(.*{.*$|^}$|.*}$)/;
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