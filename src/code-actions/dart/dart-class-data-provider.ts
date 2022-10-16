import * as vscode from 'vscode';
import {
    ConstructorCodeAction,
    CopyWithCodeAction,
    DartCodeProvider,
    EqualityCodeAction,
    FromJsonCodeAction,
    FromMapCodeAction, ToJsonCodeAction,
    ToMapCodeAction,
    ToStringCodeAction
} from '.';
import { MapMethodGenerator, ToStringMethodGenerator } from '../../generators';
import { CodeActionValue, ElementKind } from '../../interface';
import { ClassDataTemplate } from '../../templates';
import '../../types/array';
import '../../types/string';

export const UPDATE_COMMAND = 'update.class.data';
export const GENERATE_COMMAND = 'generate.class.data';
export const IMPLEMENT_COPY_WITH_COMMAND = 'implement.copywith';

export class DartClassDataProvider {
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

        this.constructorCode = new ConstructorCodeAction(provider, element);
        this.toString = new ToStringCodeAction(provider, new ToStringMethodGenerator(element));
        this.fromMap = new FromMapCodeAction(provider, new MapMethodGenerator(element));
        this.toMap = new ToMapCodeAction(provider, element);
        this.fromJson = new FromJsonCodeAction(provider, element, this.fromMap.range?.end);
        this.toJson = new ToJsonCodeAction(provider, element, this.toMap.range?.end);
        this.equality = new EqualityCodeAction(provider, element);
        this.copyWith = new CopyWithCodeAction(provider, element);
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
            // this.toJson,
            //this.fromJson,
            ...this.copyWith.items,
            //...this.fromMap.replacements,
            // ...this.toMap.replacements,
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
        const { editor } = this.provider;
        if (!editor || this.provider.document.languageId !== 'dart') return;

        const removalsRanges = [
            ...this.fromMap.removals,
            ...this.toMap.removals,
        ];

        const insertionsItems = [
            ...this.fromMap.insertions,
            ...this.toMap.insertions,
        ];

        await editor.edit((builder) => {
            if (this.equality.equatable.isGenerated && !this.equality.useEquatable) {
                const equatableRange = this.equality.equatable.range;
                if (equatableRange) {
                    removalsRanges.push(this.provider.reader.rangeWithRemarks(equatableRange));
                }
            }

            for (const { value, range } of this.values) {
                if (!range) continue;
                builder.replace(range, value);
            }

            for (const { position, insertion } of insertionsItems) {
                builder.insert(position, insertion);
            }

            for (const range of removalsRanges) {
                builder.delete(range);
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
