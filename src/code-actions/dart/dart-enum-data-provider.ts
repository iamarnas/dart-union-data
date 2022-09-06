import * as vscode from 'vscode';
import { ElementKind } from '../../interface';
import { ClassDataTemplate } from '../../templates';
import { EnumCodeActionData } from './actions/enum-code-action-data';
import { DartCodeProvider } from './dart-code-provider';

export const UPDATE_ENUM_COMMAND = 'update.enum.data';

export class DartEnumDataProvider {
    readonly data: EnumCodeActionData;

    constructor(private provider: DartCodeProvider, private element: ClassDataTemplate) {
        if (element.kind !== ElementKind.enum) {
            console.error('DartEnumDataProvider: Syntax error due to invalid element type');
        }

        this.data = new EnumCodeActionData(this.provider, element);
    }

    get isEmpty(): boolean {
        return this.element.enumMembers.length === 0;
    }

    get hasChanges(): boolean {
        return this.data.hasChanges || this.data.extension.hasChanges;
    }

    get actions(): vscode.CodeAction[] {
        if (this.element.isEnhancedEnum) return this.data.actions;
        return this.data.extension.actions;
    }

    updateCommand(args: any[], diagnostics?: vscode.Diagnostic[]): vscode.CodeAction {
        return this.provider.createCommand({
            command: UPDATE_ENUM_COMMAND,
            title: 'Update All Changes',
            tooltip: 'This will update all enum members or enum extension members',
            arguments: args,
        },
            diagnostics,
        );
    }

    async updateChanges() {
        const editor = this.provider.editor;
        if (!editor || this.provider.document.languageId !== 'dart') return;

        await editor.edit((builder) => {
            for (const item of this.data.removals.concat(...this.data.extension.removals)) {
                builder.delete(this.provider.reader.rangeWithRemarks(item.range));
            }

            for (const item of this.data.insertions.concat(...this.data.extension.insertions)) {
                builder.insert(item.position, item.insertion);
            }

            for (const item of this.data.replacements.concat(...this.data.extension.replacements)) {
                const range = item.range;
                if (!range) continue;
                builder.replace(range, item.value);
            }
        });
    }
}
