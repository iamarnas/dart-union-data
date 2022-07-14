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

        // vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
        //     this.code = new DartCodeProvider(event.textEditor);
        // });

        vscode.window.onDidChangeTextEditorSelection((event) => {
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
        const element = this.code.element;

        if (!element || !this.code.range) return;

        if (element.kind === ElementKind.enum) {
            const enumCode = new DartEnumDataProvider(this.code, element);

            console.log(enumCode);

            if (enumCode.isEmpty) return;

            if (element.isEnhancedEnum) {
                if (enumCode.extension.isUpdated) return;

                if (!enumCode.extension.isGenerated && !enumCode.hasData) {
                    actions.push(enumCode.extension.fix());
                }

                if (enumCode.extension.isGenerated && !enumCode.extension.isUpdated) {
                    actions.push(enumCode.updateCommand());
                    return actions;
                }

                if (!enumCode.hasData) {
                    actions.push(enumCode.enumDataFix());
                }

                if (!enumCode.hasCheckers) {
                    actions.push(enumCode.checkersFix());
                }

                if (!enumCode.hasMethods) {
                    actions.push(enumCode.methodsFix());
                }

                if (enumCode.hasChanges) {
                    actions.push(enumCode.updateCommand());
                }

                return actions;
            }

            if (enumCode.hasChanges) {
                actions.push(enumCode.updateCommand());
            }

            if (!enumCode.extension.isGenerated) {
                actions.push(enumCode.extension.fix());
            }

            return actions;
        }

        if (element.kind === ElementKind.class) {
            const dartCode = this.code.data;

            if (!element.hasData || !dartCode) return;

            if (dartCode.hasNoDataCreated) {
                actions.push(dartCode.generateCommand());
            }

            if (dartCode.hasChanges) {
                actions.push(dartCode.updateCommand());
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
}
