/* eslint-disable @typescript-eslint/no-unused-vars */
import * as vscode from 'vscode';
import { DartCodeProvider } from '.';
import { ElementKind } from '../interface';
import '../types/array';
import '../types/string';

export class DartCodeActionProvider implements vscode.CodeActionProvider<vscode.CodeAction> {
    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken,
    ): vscode.ProviderResult<Array<vscode.CodeAction | vscode.Command>> {
        const dartCodeActions = this.dartCodeActions(document, range);
        return dartCodeActions ?? [];
    }

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.RefactorRewrite,
    ];

    private dartCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined {
        const actions: vscode.CodeAction[] = [];
        const provider = new DartCodeProvider(document, range);
        const element = provider.element;

        if (element === undefined) return;

        // Obs! The order of the `if` statements in this code is important.
        // Changing positions can lead to false or unnecessary quick-fix predictions.

        if (element.kind === ElementKind.enum) {
            const enumCode = provider.enum;

            if (!enumCode || enumCode.isEmpty) return;

            console.log(enumCode);

            if (enumCode.hasChanges) {
                actions.push(enumCode.updateCommand([enumCode]));
            }

            return actions.concat(...enumCode.actions);
        }

        if (element.kind === ElementKind.class) {
            const dartCode = provider.data;

            if (!element.hasData || !dartCode) return;

            console.log(dartCode);

            if (dartCode.hasNoDataCreated) {
                actions.push(dartCode.generateCommand(dartCode));
            }

            if (dartCode.hasChanges) {
                actions.push(dartCode.updateCommand(dartCode));
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

            if (!dartCode.copyWith.method.isGenerated) {
                actions.push(dartCode.copyWith.method.fix());
            }

            if (dartCode.toMap.isGenerated && !dartCode.toJson.isGenerated) {
                actions.push(dartCode.toJson.fix());
            }

            if (dartCode.fromMap.isGenerated && !dartCode.fromJson.isGenerated) {
                actions.push(dartCode.fromJson.fix());
            }

            if (!dartCode.equality.isGenerated) {
                actions.push(dartCode.equality.fix());
            }
        }

        return actions;
    }
}
