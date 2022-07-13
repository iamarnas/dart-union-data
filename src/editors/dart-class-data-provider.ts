import * as vscode from 'vscode';
import { CodeValue, DartCodeProvider } from '.';
import { DartCodeGenerator } from '../generators';
import { ElementKind } from '../interface';
import { ClassDataTemplate } from '../templates';
import '../types/string';
import { identicalCode } from '../utils';

export const UPDATE_COMMAND = 'update.class.data';
export const GENERATE_COMMAND = 'generate.class.data';

export class DartClassDataProvider {
    readonly code: DartCodeGenerator;
    readonly constructorCode: ConstructorCode;
    readonly toString: ToStringCode;
    readonly fromMap: FromMapCode;
    readonly toMap: ToMapCode;
    readonly fromJson: FromJsonCode;
    readonly toJson: ToJsonCode;

    constructor(private provider: DartCodeProvider, private element: ClassDataTemplate) {
        if (element.kind !== ElementKind.class) {
            console.error('Syntax error due to invalid element type');
        }

        this.code = new DartCodeGenerator(element);
        this.constructorCode = new ConstructorCode(provider, element);
        this.toString = new ToStringCode(provider, element);
        this.fromMap = new FromMapCode(provider, element);
        this.toMap = new ToMapCode(provider, element);
        this.fromJson = new FromJsonCode(provider, element);
        this.toJson = new ToJsonCode(provider, element);

        // Update the position to insert `fromJson` below the `fromMap`.
        if (this.fromMap.range !== undefined) {
            this.fromJson = new FromJsonCode(
                provider,
                element,
                new vscode.Position(this.fromMap.range.end.line + 1, 0),
            );
        }

        // Update the position to insert `toJson` below the `toMap`.
        if (this.toMap.range !== undefined) {
            this.toJson = new ToJsonCode(
                provider,
                element,
                new vscode.Position(this.toMap.range.end.line + 1, 0),
            );
        }
    }

    get hasConvertImport(): boolean {
        return this.provider.lines.some((line) => {
            return line.text.includesAll('import', 'dart:convert', ';');
        });
    }

    get hasVariables(): boolean {
        return this.element.instanceVariables.isNotEmpty;
    }

    get hasFactories(): boolean {
        return this.element.factories.length !== 0;
    }

    get values() {
        return [
            this.constructorCode,
            this.toString,
            this.fromMap,
            this.toMap,
            this.fromJson
        ];
    }

    get hasChanges(): boolean {
        const generated = this.values.filter((e) => e.isGenerated);
        return generated.some((e) => !e.isUpdated);
    }

    get hasNoDataCreated(): boolean {
        return this.values.every((e) => !e.isGenerated);
    }

    /**
     * The `vscode.CodeAction` command to update all members of the class.
     * @returns `vscode.CodeAction`.
     */
    updateCommand(): vscode.CodeAction {
        return this.provider.command({
            command: UPDATE_COMMAND,
            title: 'Update All Changes',
            tooltip: 'This will update all members of the class',
        });
    }

    /**
     * The `vscode.CodeAction` command to generate all members of the class.
     * @returns `vscode.CodeAction`.
     */
    generateCommand(): vscode.CodeAction {
        return this.provider.command({
            command: GENERATE_COMMAND,
            title: 'Generate Class Data',
            tooltip: 'This will generate all members of the class',
        });
    }

    updateChanges() {
        this.provider.replace(...this.values);
    }

    generateData() {
        const insertions: CodeValue[] = [];

        if (!this.hasConvertImport) {
            insertions.push({
                position: new vscode.Position(0, 0),
                replacement: "import 'dart:convert';\n\n"
            } as CodeValue);
        }

        this.provider.insert(...insertions, ...this.values);
    }
}

class ConstructorCode implements CodeValue {
    value: string;

    constructor(private provider: DartCodeProvider, private element: ClassDataTemplate) {
        this.value = '\t' + new DartCodeGenerator(element).writeConstructor().generate();
    }

    get replacement(): string {
        const space = this.provider.start.isEmptyOrWhitespace ? '' : '\n';
        return '\n' + this.value + space;
    }

    get position(): vscode.Position {
        return this.provider.start.range.end;
    }

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get isUpdated(): boolean {
        return identicalCode(
            this.value,
            this.provider.getTextFromCode(this.range),
        );
    }

    get range(): vscode.Range | undefined {
        return this.provider.whereCodeFirstLine((line) => {
            return line.text.indexOf(`${this.element.name}(`) !== -1
                && !line.text.includesOne('toString()', '=>', 'return');
        }, this.provider.codeLines);
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate Contructor',
            this.replacement,
        );
    }
}

class ToStringCode implements CodeValue {
    value: string;

    constructor(private provider: DartCodeProvider, private element: ClassDataTemplate) {
        this.value = new DartCodeGenerator(element).writeToString().generate();
    }

    get replacement(): string {
        return '\n\t@override\n' + this.value + '\n';
    }

    get position(): vscode.Position {
        return this.provider.endPositionWithinCode();
    }

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get isUpdated(): boolean {
        return identicalCode(
            this.value,
            this.provider.getTextFromCode(this.range),
        );
    }

    get range(): vscode.Range | undefined {
        return this.provider.findCodeRange('String toString() ', this.provider.codeLines);
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate to String Method',
            this.replacement,
        );
    }
}

class FromMapCode implements CodeValue {
    value: string;

    constructor(private provider: DartCodeProvider, private element: ClassDataTemplate) {
        this.value = new DartCodeGenerator(this.element).writeFromMap().generate();
    }

    get replacement(): string {
        return '\n' + this.value + '\n';
    }

    get position(): vscode.Position {
        return this.provider.endPositionWithinCode();
    }

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get isUpdated(): boolean {
        return identicalCode(
            this.value,
            this.provider.getTextFromCode(this.range),
        );
    }

    get range(): vscode.Range | undefined {
        return this.provider.findCodeRange(this.value, this.provider.codeLines);
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate fromMap Map',
            this.replacement,
        );
    }
}

class ToMapCode implements CodeValue {
    value: string;

    constructor(private provider: DartCodeProvider, private element: ClassDataTemplate) {
        this.value = new DartCodeGenerator(this.element).writeToMap().generate();
    }

    get replacement(): string {
        return '\n' + this.value + '\n';
    }

    get position(): vscode.Position {
        return this.provider.endPositionWithinCode();
    }

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get isUpdated(): boolean {
        return identicalCode(
            this.value,
            this.provider.getTextFromCode(this.range),
        );
    }

    get range(): vscode.Range | undefined {
        return this.provider.findCodeRange(this.value, this.provider.codeLines);
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate toMap Map',
            this.replacement,
        );
    }
}

class FromJsonCode implements CodeValue {
    value: string;
    position: vscode.Position;

    constructor(
        private provider: DartCodeProvider,
        element: ClassDataTemplate,
        position?: vscode.Position,
    ) {
        this.value = new DartCodeGenerator(element).writeFromJson().generate();
        this.position = position ?? provider.endPositionWithinCode();
    }

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get range(): vscode.Range | undefined {
        return this.provider.findCodeRange(this.value, this.provider.codeLines);
    }

    get replacement(): string {
        return '\n' + this.value + '\n';
    }

    get isUpdated(): boolean {
        return identicalCode(
            this.value,
            this.provider.getTextFromCode(this.range),
        );
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate from JSON Codecs',
            this.replacement,
        );
    }
}

class ToJsonCode implements CodeValue {
    value: string;
    position: vscode.Position;

    constructor(
        private provider: DartCodeProvider,
        element: ClassDataTemplate,
        position?: vscode.Position,
    ) {
        this.value = new DartCodeGenerator(element).writeToJson().generate();
        this.position = position ?? provider.endPositionWithinCode();
    }

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get range(): vscode.Range | undefined {
        return this.provider.findCodeRange(this.value, this.provider.codeLines);
    }

    get replacement(): string {
        return '\n' + this.value + '\n';
    }

    get isUpdated(): boolean {
        return identicalCode(
            this.value,
            this.provider.getTextFromCode(this.range),
        );
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate to JSON Codecs',
            this.replacement,
        );
    }
}