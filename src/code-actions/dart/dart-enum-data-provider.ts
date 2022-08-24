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

    updateCommand(...args: any[]): vscode.CodeAction {
        return this.provider.command({
            command: UPDATE_ENUM_COMMAND,
            title: 'Update All Changes',
            tooltip: 'This will update all enum members or extension',
            arguments: args,
        });
    }

    updateChanges() {
        const editor = this.provider.editor;
        if (!editor || this.provider.document.languageId !== 'dart') return;

        if (!this.element.isEnhancedEnum && !this.data.extension.isUpdated) {
            this.data.extension.update();
            return;
        }

        editor.edit((builder) => {
            for (const item of this.data.removals) {
                builder.delete(this.provider.rangeWithRemarks(item.range));
            }

            for (const item of this.data.insertions) {
                builder.insert(item.position, item.insertion);
            }

            for (const value of this.data.replacements) {
                const range = value.range;
                if (!range) continue;
                builder.replace(range, value.value);
            }
        });
    }
}
