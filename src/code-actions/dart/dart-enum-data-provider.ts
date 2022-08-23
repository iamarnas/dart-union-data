import * as vscode from 'vscode';
import { ElementKind } from '../../interface';
import { ClassDataTemplate } from '../../templates';
import { EnumCodeAction } from './actions/enum-code-action';
import { DartCodeProvider } from './dart-code-provider';

export const UPDATE_ENUM_COMMAND = 'update.enum.data';

export class DartEnumDataProvider {
    readonly enum: EnumCodeAction;

    constructor(private provider: DartCodeProvider, private element: ClassDataTemplate) {
        if (element.kind !== ElementKind.enum) {
            console.error('DartEnumDataProvider: Syntax error due to invalid element type');
        }

        this.enum = new EnumCodeAction(this.provider, element);
    }

    // private get removals() {
    //     return this.enum.currentItems.filter((curr) => !this.enum.items.some((e) => e.range?.contains(curr)));
    // }

    // private get insertions(): CodeActionValue[] {
    //     if (!this.element.isEnhancedEnum) {
    //         return !this.enum.extension.isGenerated ? [this.enum.extension] : [];
    //     }
    //     return this.enum.allItems.filter((e) => !e.isGenerated);
    // }

    // private get replacements(): CodeActionValue[] {
    //     return this.enum.items.filter((e) => e.isGenerated && !e.isUpdated);
    // }

    get isEmpty(): boolean {
        return this.element.enumMembers.length === 0;
    }

    // get hasChanges(): boolean {
    //     return this.removals.length !== 0 || this.replacements.length !== 0;
    // }

    get actions(): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = [];

        if (this.enum.extension.isGenerated) return actions;

        if (!this.element.isEnhancedEnum) {
            return actions.concat(this.enum.extension.fix());
        }

        if (this.enum.checkers.every((e) => !e.isGenerated)) {
            actions.push(this.enum.checkersFix());
        }

        if (this.enum.methods.every((e) => !e.isGenerated)) {
            actions.push(this.enum.methodsFix());
        }

        // if (!this.enum.hasChecker && !this.enum.hasMetod) {
        //     actions.push(this.enum.extension.fix());
        // }

        // if (!this.enum.hasData) {
        //     actions.push(this.enum.fix());
        // }

        return actions;

    }

    updateCommand(...args: any[]): vscode.CodeAction {
        return this.provider.command({
            command: UPDATE_ENUM_COMMAND,
            title: 'Update All Changes',
            tooltip: 'This will update all enum members',
            arguments: args,
        });
    }

    updateChanges() {
        const editor = this.provider.editor;
        if (!editor || this.provider.document.languageId !== 'dart') return;

        if (this.element.isEnhancedEnum) {
            this.enum.extension.update();
        }

        // editor.edit((builder) => {
        //     for (const range of this.removals) {
        //         builder.delete(this.provider.rangeWithRemarks(range));
        //     }

        //     for (const item of this.insertions) {
        //         builder.insert(item.position, item.insertion);
        //     }

        //     for (const value of this.replacements) {
        //         const range = value.range;
        //         if (!range) continue;
        //         builder.replace(range, value.value);
        //     }
        // });
    }

    generateData() {
        this.provider.insert(...this.enum.checkers, ...this.enum.methods);
    }
}
