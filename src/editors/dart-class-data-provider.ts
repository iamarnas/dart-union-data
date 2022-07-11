import * as vscode from 'vscode';
import { DartCodeProvider, InsertionValue } from '.';
import { DartCodeGenerator } from '../generators';
import { ElementKind } from '../interface';
import { ClassDataTemplate } from '../templates';
import '../types/string';
import { identicalCode } from '../utils';

export const UPDATE_CLASS_DATA = 'update.class.data';
export const GENERATE_CLASS_DATA = 'generate.class.data';

export class DartClassDataProvider {
    readonly code: DartCodeGenerator;

    constructor(private provider: DartCodeProvider, private element: ClassDataTemplate) {
        if (element.kind !== ElementKind.class) {
            console.error('Syntax error due to invalid element type');
        }

        this.code = new DartCodeGenerator(element);
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

    get hasEqualConstructor(): boolean {
        return this.constructorRange() !== undefined
            && identicalCode(
                this.constructorBody(),
                this.provider.getTextFromCode(this.constructorRange()),
            );
    }

    get hasEqualToStringMethod(): boolean {
        return this.toStringMethodRange() !== undefined
            && identicalCode(
                this.toStringMethod(),
                this.provider.getTextFromCode(this.toStringMethodRange()),
            );
    }

    get hasEqualFromMap(): boolean {
        return this.fromMapRange() !== undefined
            && identicalCode(
                this.fromMap(),
                this.provider.getTextFromCode(this.fromMapRange()),
            );
    }

    get hasEqualToMap(): boolean {
        return this.toMapRange() !== undefined
            && identicalCode(
                this.toMap(),
                this.provider.getTextFromCode(this.toMapRange()),
            );
    }

    get hasInstancesMember(): boolean {
        return this.hasEqualConstructor
            || this.hasEqualToStringMethod
            || this.hasEqualFromMap
            || this.hasEqualToMap;
    }

    get hasToJson(): boolean {
        return this.provider.has(new DartCodeGenerator(this.element).writeToJson().generate());
    }

    get hasFromJson(): boolean {
        return this.provider.has(new DartCodeGenerator(this.element).writeFromJson().generate());
    }

    constructorBody(): string {
        return new DartCodeGenerator(this.element).writeConstructor().generate();
    }

    constructorRange(): vscode.Range | undefined {
        return this.provider.whereCodeFirstLine((line) => {
            return line.text.indexOf(`${this.element.name}(`) !== -1
                && !line.text.includesOne('toString()', '=>', 'return');
        }, this.provider.codeLines);
    }

    constructorCodeAction(): vscode.CodeAction {
        return this.provider.insert(
            this.provider.start.range.end,
            'Generate Contructor',
            this.constructorInsertion(),
        );
    }

    toStringMethod(): string {
        return new DartCodeGenerator(this.element).writeToString().generate();
    }

    toStringMethodRange(): vscode.Range | undefined {
        return this.provider.findCodeRange('String toString() ', this.provider.codeLines);
    }

    toStringMethodCodeAction(): vscode.CodeAction {
        return this.provider.insert(
            this.provider.endPositionWithinCode(),
            'Generate to String Method',
            this.toStringMethodInsertion(),
        );
    }

    fromMap(): string {
        return new DartCodeGenerator(this.element).writeFromMap().generate();
    }

    fromMapRange(): vscode.Range | undefined {
        return this.provider.findCodeRange(this.fromMap(), this.provider.codeLines);
    }

    fromMapCodeAction(): vscode.CodeAction {
        return this.provider.insert(
            this.provider.endPositionWithinCode(),
            'Generate fromMap Map',
            this.fromMapInsertion(),
        );
    }

    toMap(): string {
        return new DartCodeGenerator(this.element).writeToMap().generate();
    }

    toMapRange(): vscode.Range | undefined {
        return this.provider.findCodeRange(this.toMap(), this.provider.codeLines);
    }

    toMapCodeAction(): vscode.CodeAction {
        return this.provider.insert(
            this.provider.endPositionWithinCode(),
            'Generate toMap Map',
            this.toMapInsertion(),
        );
    }

    jsonCodecs(): string {
        return new DartCodeGenerator(this.element).writeJsonCodecs().generate();
    }

    toJsonCodec(): string {
        return new DartCodeGenerator(this.element).writeToJson().generate();
    }

    /**
     * The code action for `toJson` method.
     * @returns [vscode.CodeAction] or undefined if {@link toMap `toMap`} {@link toMapRange range} does not exist.
     */
    toJsonCodecCodeAction(): vscode.CodeAction | undefined {
        const range = this.toMapRange();

        if (range) {
            const position = new vscode.Position(range.end.line + 1, 0);
            return this.provider.insert(position, 'Generate to JSON Codecs', this.toJsonCodecInsertion());
        }
    }

    fromJsonCodec(): string {
        return new DartCodeGenerator(this.element).writeFromJson().generate();
    }

    // Inserts.
    constructorInsertion(): string {
        const space = this.provider.start.isEmptyOrWhitespace ? '' : '\n';
        return '\n\t' + this.constructorBody() + space;
    }

    toStringMethodInsertion(): string {
        return '\n\t@override\n' + this.toStringMethod() + '\n';
    }

    fromMapInsertion(): string {
        return '\n' + this.fromMap() + '\n';
    }

    toMapInsertion(): string {
        return '\n' + this.toMap() + '\n';
    }

    fromJsonCodecInsertion(): string {
        return '\n' + this.fromJsonCodec() + '\n';
    }

    toJsonCodecInsertion(): string {
        return '\n' + this.toJsonCodec() + '\n';
    }

    /**
     * The code action for `fromJson` method.
     * @returns [vscode.CodeAction] or undefined if {@link fromMap `fromMap`} {@link fromMapRange range} does not exist.
     */
    fromJsonCodecCodeAction(): vscode.CodeAction | undefined {
        const range = this.fromMapRange();
        if (!range) return;
        const position = new vscode.Position(range.end.line + 1, 0);
        return this.provider.insert(position, 'Generate From JSON Codecs', this.fromJsonCodecInsertion());
    }

    updateChangesCommand(): vscode.CodeAction {
        return this.provider.createCommand({
            command: UPDATE_CLASS_DATA,
            title: 'Update All Changes',
            tooltip: 'This will update all members of the class',
        });
    }

    insertAllCommand(): vscode.CodeAction {
        return this.provider.createCommand({
            command: GENERATE_CLASS_DATA,
            title: 'Generate Class Data',
            tooltip: 'This will generate all members of the class',
        });
    }

    updateChanges() {
        const toStringRange = this.toStringMethodRange();
        const constructorRange = this.constructorRange();
        const fromMapRange = this.fromMapRange();
        const toMapRange = this.toMapRange();

        if (constructorRange && !this.hasEqualConstructor) {
            this.provider.replaceValue(constructorRange, this.constructorBody());
        }

        if (toStringRange && !this.hasEqualToStringMethod) {
            this.provider.replaceValue(toStringRange, this.toStringMethod());
        }

        if (fromMapRange && !this.hasEqualFromMap) {
            this.provider.replaceValue(fromMapRange, this.fromMap());
        }

        if (toMapRange && !this.hasEqualToMap) {
            this.provider.replaceValue(toMapRange, this.toMap());
        }
    }

    insertAll() {
        const insertions: InsertionValue[] = [];
        if (!this.hasConvertImport) {
            insertions.push({ position: new vscode.Position(0, 0), value: "import 'dart:convert';\n\n" });
        }

        insertions.push(
            { position: this.provider.start.range.end, value: this.constructorInsertion() },
            {
                position: this.provider.endPositionWithinCode(),
                value: this.toStringMethodInsertion()
                    + this.fromMapInsertion()
                    + this.fromJsonCodecInsertion()
                    + this.toMapInsertion()
                    + this.toJsonCodecInsertion()
            }
        );

        this.provider.insertValue(...insertions);
    }
}
