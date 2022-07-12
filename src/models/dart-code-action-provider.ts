/* eslint-disable @typescript-eslint/no-unused-vars */
import * as vscode from 'vscode';
import { DartCodeProvider, DartEnumDataProvider } from '../editors';
import { ElementKind } from '../interface';
import '../types/array';
import '../types/string';

export class DartCodeActionProvider implements vscode.CodeActionProvider {
    code: DartCodeProvider;

    constructor(public editor: vscode.TextEditor) {
        this.code = new DartCodeProvider(editor);

        vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
            this.code = new DartCodeProvider(event.textEditor);
        });
    }

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken,
    ): vscode.ProviderResult<Array<vscode.CodeAction | vscode.Command>> {
        const dartCodeActions = this.dartCodeActions(document, range);
        return !dartCodeActions ? [] : dartCodeActions;
    }

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.RefactorRewrite,
    ];

    private dartCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined {
        const actions: vscode.CodeAction[] = [];
        const end = new vscode.Position(
            document.lineCount - 1,
            document.lineAt(document.lineCount - 1).range.end.character,
        );

        const element = this.code.element;

        if (!element || !this.code.range) return;

        if (element.kind === ElementKind.enum) {
            const enumCode = new DartEnumDataProvider(this.code, element);
            const enumExtensionRange = enumCode.extensionRange();
            const enumCheckersRange = enumCode.checkersRange();
            const enumMethodsRange = enumCode.methodsRange();

            if (enumCode.isEmpty) return;

            if (element.isEnhancedEnum) {
                if (!this.code.contains(enumCheckersRange) && !this.code.contains(enumMethodsRange)) {
                    actions.push(this.insertFix(document, this.code.endPositionWithinCode(), 'Generate Enum Data', enumCode.checkersAndMethods()));
                }

                if (!this.code.contains(enumCheckersRange)) {
                    actions.push(this.insertFix(document, this.code.endPositionWithinCode(), 'Generate Enum Checkers', '\n' + enumCode.checkers() + '\n'));
                }

                if (!this.code.contains((enumMethodsRange))) {
                    actions.push(this.insertFix(document, this.code.endPositionWithinCode(), 'Generate Enum Methods', '\n' + enumCode.methods() + '\n'));
                }

                if (enumCheckersRange && !enumCode.hasEqualCheckers) {
                    actions.push(this.replaceFix(document, enumCheckersRange, 'Update Enum Checkers', enumCode.checkers()));
                }

                if (enumMethodsRange && !enumCode.hasEqualMethods) {
                    actions.push(this.replaceFix(document, enumMethodsRange, 'Update Enum Methods', enumCode.methods()));
                }

                return actions;
            }

            if (!this.code.contains(enumExtensionRange)) {
                const spacing = document.lineAt(end.line).isEmptyOrWhitespace ? '\n' : '\n\n';
                actions.push(this.insertFix(document, end, 'Generate Enum Extension', spacing + enumCode.extension() + '\n'));
            }

            if (enumExtensionRange && !enumCode.hasEqualExtension) {
                actions.push(this.replaceFix(document, enumExtensionRange, 'Update Enum Extension', enumCode.extension()));
            }

            return actions;
        }

        if (element.kind === ElementKind.class) {
            const dartCode = this.code.data;

            if (!element.hasData || !dartCode) return;

            if (dartCode.hasNoDataCreated) {
                actions.push(dartCode.insertAllCommand());
            }

            if (dartCode.hasChanges) {
                actions.push(dartCode.updateChangesCommand());
            }

            if (!dartCode.constructorCode.isGenerated) {
                actions.push(dartCode.constructorCode.fix());
            }

            if (!dartCode.toString.isGenerated) {
                actions.push(dartCode.toString.fix());
            }

            if (!dartCode.fromMap.isGenerated) {
                actions.push(dartCode.fromMap.fix());
            }

            if (!dartCode.toMap.isGenerated) {
                actions.push(dartCode.toMap.fix());
            }

            if (dartCode.toMap.isGenerated && !dartCode.toJson.isGenerated) {
                actions.push(dartCode.toJson.fix());
            }

            if (dartCode.fromMap.isGenerated && !dartCode.fromJson.isGenerated) {
                actions.push(dartCode.fromJson.fix());
            }
        }

        return actions;
    }

    private insertFix(
        document: vscode.TextDocument,
        position: vscode.Position,
        title: string,
        text: string,
    ): vscode.CodeAction {
        const fix = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();
        fix.isPreferred = true;
        fix.edit.insert(document.uri, position, text);
        return fix;
    }

    private replaceFix(
        document: vscode.TextDocument,
        range: vscode.Range,
        title: string,
        text: string,
    ): vscode.CodeAction {
        const fix = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();
        fix.isPreferred = true;
        fix.edit.replace(document.uri, range, text);
        return fix;
    }
}
