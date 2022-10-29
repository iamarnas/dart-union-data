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
        const { element, data, enumData } = provider;

        if (!element) return;

        // Obs! The order of the `if` statements in this code is important.
        // Changing positions can lead to false or unnecessary quick-fix predictions.

        if (element.kind === ElementKind.enum) {

            if (!enumData || enumData.isEmpty) return;

            console.log(enumData);

            if (enumData.hasChanges) {
                actions.push(enumData.updateCommand([enumData]));
            }

            return actions.concat(...enumData.actions);
        }

        if (element.kind === ElementKind.class) {

            if (!element.hasData || !data) return;

            console.log(data);

            if (data.hasNoDataCreated) {
                actions.push(data.generateCommand(data));
            }

            if (data.hasChanges) {
                actions.push(data.updateCommand(data));
            }

            if (!data.constructorCode.isGenerated) {
                actions.push(data.constructorCode.fix());
            }

            if (!data.toString.isGenerated) {
                actions.push(data.toString.fix());
            }

            if (!data.fromMap.isGenerated) {
                actions.push(data.fromMap.fix());
            }

            if (!data.toMap.isGenerated) {
                actions.push(data.toMap.fix());
            }

            if (!data.copyWith.method.isGenerated) {
                actions.push(data.copyWith.method.fix());
            }

            if (data.toMap.isGenerated && !data.toJson.isGenerated) {
                actions.push(data.toJson.fix());
            }

            if (data.fromMap.isGenerated && !data.fromJson.isGenerated) {
                actions.push(data.fromJson.fix());
            }

            if (!data.equality.isGenerated) {
                actions.push(data.equality.fix());
            }
        }

        return actions;
    }
}
