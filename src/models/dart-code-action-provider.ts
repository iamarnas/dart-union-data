import * as vscode from 'vscode';
import { ClassDataGenerator } from '../generators/class-data.generator';
import { EnumDataGenerator } from '../generators/enum.generator';
import { ElementBuilder } from '../interface/element-builder';
import regexp from '../utils/regexp';

const FORMAT_DOCUMENT = 'editor.action.formatDocument';
const FORMAT_CHANGES = 'editor.action.formatChanges';

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
        if (!this.containsClassSyntax(document, range)) return null;
        const text = this.getText(document, range);
        const element = ElementBuilder.fromString(text).buildElement();
        if (element === undefined) return null;
        let dartCode = '';

        // TODO: remove test.
        console.log(element);

        if (element.isEnum) {
            dartCode = new EnumDataGenerator(element).generateExtension();
        } else {
            dartCode = new ClassDataGenerator(element).generateSubclasses();
        }

        const fix = new vscode.CodeAction('Generate Union Data', vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();
        // Marking a single fix as `preferred` means that users can apply it with a
        // single keyboard shortcut using the `Auto Fix` command.
        fix.isPreferred = true;
        fix.edit.insert(document.uri, new vscode.Position((document.lineCount + 1), 0), dartCode);

        //vscode.commands.executeCommand(FORMAT_DOCUMENT);

        return fix;
    }

    private containsClassSyntax(document: vscode.TextDocument, range: vscode.Range): boolean {
        const textLine = document.lineAt(range.start.line).text;
        return regexp.classMatch.test(textLine);
    }

    private getText(document: vscode.TextDocument, range: vscode.Range): string {
        const start = document.lineAt(range.start).range.start;
        const end = document.lineAt(document.lineCount - 1).range.end;
        const textRange = new vscode.Range(start, end);
        return document.getText(textRange);
    }
}