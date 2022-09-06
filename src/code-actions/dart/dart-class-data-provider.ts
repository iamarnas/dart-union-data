import * as vscode from 'vscode';
import {
    ConstructorCodeAction,
    CopyWithCodeAction,
    DartCodeProvider,
    EqualityCodeAction,
    FromJsonCodeAction,
    FromMapCodeAction,
    ToJsonCodeAction,
    ToMapCodeAction,
    ToStringCodeAction
} from '.';
import { DartCodeGenerator } from '../../generators';
import { CodeActionValue, ElementKind } from '../../interface';
import { ClassDataTemplate } from '../../templates';
import '../../types/array';
import '../../types/string';

export const UPDATE_COMMAND = 'update.class.data';
export const GENERATE_COMMAND = 'generate.class.data';
export const IMPLEMENT_COPY_WITH_COMMAND = 'implement.copywith';

export class DartClassDataProvider {
    readonly code: DartCodeGenerator;
    readonly constructorCode: ConstructorCodeAction;
    readonly toString: ToStringCodeAction;
    readonly fromMap: FromMapCodeAction;
    readonly toMap: ToMapCodeAction;
    readonly fromJson: FromJsonCodeAction;
    readonly toJson: ToJsonCodeAction;
    readonly equality: EqualityCodeAction;
    readonly copyWith: CopyWithCodeAction;

    constructor(private provider: DartCodeProvider, private element: ClassDataTemplate) {
        if (element.kind !== ElementKind.class) {
            console.error('Syntax error due to invalid element type');
        }

        this.code = new DartCodeGenerator(element);
        this.constructorCode = new ConstructorCodeAction(provider, element);
        this.toString = new ToStringCodeAction(provider, element);
        this.fromMap = new FromMapCodeAction(provider, element);
        this.toMap = new ToMapCodeAction(provider, element);
        this.fromJson = new FromJsonCodeAction(provider, element);
        this.toJson = new ToJsonCodeAction(provider, element);
        this.equality = new EqualityCodeAction(provider, element);
        this.copyWith = new CopyWithCodeAction(provider, element);

        // Update the position to insert `fromJson` below the `fromMap`.
        if (this.fromMap.range !== undefined) {
            this.fromJson = new FromJsonCodeAction(
                provider,
                element,
                new vscode.Position(this.fromMap.range.end.line + 1, 0),
            );
        }

        // Update the position to insert `toJson` below the `toMap`.
        if (this.toMap.range !== undefined) {
            this.toJson = new ToJsonCodeAction(
                provider,
                element,
                new vscode.Position(this.toMap.range.end.line + 1, 0),
            );
        }
    }

    get hasConvertImport(): boolean {
        return this.provider.reader.lines.some((line) => {
            return line.text.includesAll('import', 'dart:convert', ';');
        });
    }

    get hasVariables(): boolean {
        return this.element.instances.isNotEmpty;
    }

    get hasFactories(): boolean {
        return this.element.factories.length !== 0;
    }

    get maps() {
        return [this.fromMap, this.toMap];
    }

    get values() {
        const values: CodeActionValue[] = [
            this.constructorCode,
            this.toString,
            this.toJson,
            this.fromJson,
            ...this.copyWith.items,
            // The map items for more accurate changes to avoid deleting comments.
            ...this.fromMap.replacements,
            ...this.toMap.replacements,
            ...this.equality.items,
        ];

        // if (this.copyWith.useAccurateCopyWith) {
        //     values.splice(2, 0, this.copyWith.getter);
        // }

        return values;
    }

    get hasChanges(): boolean {
        const generated: CodeActionValue[] = [...this.values, ...this.maps].filter((e) => e.isGenerated);
        return generated.some((e) => !e.isUpdated);
    }

    get hasNoDataCreated(): boolean {
        return this.values.every((e) => !e.isGenerated);
    }

    /**
     * The `vscode.CodeAction` command to update all members of the class.
     * @returns `vscode.CodeAction`.
     */
    updateCommand(...args: any[]): vscode.CodeAction {
        return this.provider.createCommand({
            command: UPDATE_COMMAND,
            title: 'Update All Changes',
            tooltip: 'This will update all members of the class',
            arguments: args,
        });
    }

    /**
     * The `vscode.CodeAction` command to generate all members of the class.
     * @returns `vscode.CodeAction`.
     */
    generateCommand(...args: any[]): vscode.CodeAction {
        return this.provider.createCommand({
            command: GENERATE_COMMAND,
            title: 'Generate Class Data',
            tooltip: 'This will generate all members of the class',
            arguments: args,
        });
    }

    async updateChanges() {
        const editor = this.provider.editor;
        if (!editor || this.provider.document.languageId !== 'dart') return;

        const removalsRanges = [...this.fromMap.removals, ...this.toMap.removals];
        const insertionsItems = [...this.fromMap.insertions, ...this.toMap.insertions];

        await editor.edit((builder) => {
            if (this.equality.equatable.isGenerated && !this.equality.useEquatable) {
                const equatableRange = this.equality.equatable.range;
                if (equatableRange) {
                    removalsRanges.push(this.provider.reader.rangeWithRemarks(equatableRange));
                }
            }

            for (const range of removalsRanges) {
                builder.delete(this.provider.reader.rangeWithRemarks(range));
            }

            for (const item of insertionsItems) {
                builder.insert(item.position, item.insertion);
            }

            for (const value of this.values) {
                const range = value.range;
                if (!range) continue;
                builder.replace(range, value.value);
            }
        });
    }

    async generateData() {
        const insertions: CodeActionValue[] = [];

        if (!this.hasConvertImport) {
            insertions.push({
                position: new vscode.Position(0, 0),
                insertion: "import 'dart:convert';\n\n"
            } as CodeActionValue);
        }

        const toStringIdx = this.values.findIndex((e) => e.value.includes('toString()'));
        const idx = toStringIdx !== -1 ? toStringIdx + 1 : this.values.length - 1;

        await this.provider.insert(...insertions, ...this.values.insertAt(idx, ...this.maps));
    }
}
