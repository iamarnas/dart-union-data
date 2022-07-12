import * as vscode from 'vscode';
import { DartCodeProvider, Insertion, Replacement } from '.';
import { DartCodeGenerator } from '../generators';
import { ElementKind } from '../interface';
import { ClassDataTemplate } from '../templates';
import '../types/string';
import { identicalCode } from '../utils';

export const UPDATE_DATA = 'update.class.data';
export const GENERATE_DATA = 'generate.class.data';

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
        return identicalCode(
            this.constructorBody(),
            this.provider.getTextFromCode(this.constructorRange()),
        );
    }

    get hasEqualToStringMethod(): boolean {
        return identicalCode(
            this.toStringMethod(),
            this.provider.getTextFromCode(this.toStringMethodRange()),
        );
    }

    get hasEqualFromMap(): boolean {
        return identicalCode(
            this.fromMap(),
            this.provider.getTextFromCode(this.fromMapRange()),
        );
    }

    get hasEqualToMap(): boolean {
        return identicalCode(
            this.toMap(),
            this.provider.getTextFromCode(this.toMapRange()),
        );
    }

    get changes() {
        return [
            { isGenerated: this.constructorRange() !== undefined, isEqual: this.hasEqualConstructor },
            { isGenerated: this.toStringMethodRange() !== undefined, isEqual: this.hasEqualToStringMethod },
            { isGenerated: this.fromMapRange() !== undefined, isEqual: this.hasEqualFromMap },
            { isGenerated: this.toMapRange() !== undefined, isEqual: this.hasEqualFromMap },
        ];
    }

    get hasChanges(): boolean {
        const generated = this.changes.filter((e) => e.isGenerated);
        return generated.some((e) => !e.isEqual);
    }

    get hasNoDataCreated(): boolean {
        return this.changes.every((e) => !e.isGenerated);
    }

    get hasToJson(): boolean {
        return this.provider.has(this.toJsonCodec());
    }

    get hasFromJson(): boolean {
        return this.provider.has(this.fromJsonCodec());
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

    constructorFix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.provider.start.range.end,
            'Generate Contructor',
            this.constructorReplacement(),
        );
    }

    toStringMethod(): string {
        return new DartCodeGenerator(this.element).writeToString().generate();
    }

    toStringMethodRange(): vscode.Range | undefined {
        return this.provider.findCodeRange('String toString() ', this.provider.codeLines);
    }

    toStringMethodFix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.provider.endPositionWithinCode(),
            'Generate to String Method',
            this.toStringMethodReplacement(),
        );
    }

    fromMap(): string {
        return new DartCodeGenerator(this.element).writeFromMap().generate();
    }

    fromMapRange(): vscode.Range | undefined {
        return this.provider.findCodeRange(this.fromMap(), this.provider.codeLines);
    }

    fromMapFix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.provider.endPositionWithinCode(),
            'Generate fromMap Map',
            this.fromMapReplacement(),
        );
    }

    toMap(): string {
        return new DartCodeGenerator(this.element).writeToMap().generate();
    }

    toMapRange(): vscode.Range | undefined {
        return this.provider.findCodeRange(this.toMap(), this.provider.codeLines);
    }

    toMapFix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.provider.endPositionWithinCode(),
            'Generate toMap Map',
            this.toMapReplacement(),
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
    toJsonCodecFix(): vscode.CodeAction | undefined {
        const range = this.toMapRange();

        if (range) {
            const position = new vscode.Position(range.end.line + 1, 0);
            return this.provider.insertFix(position, 'Generate to JSON Codecs', this.toJsonReplacement());
        }
    }

    fromJsonCodec(): string {
        return new DartCodeGenerator(this.element).writeFromJson().generate();
    }

    /**
     * The code action for `fromJson` method.
     * @returns [vscode.CodeAction] or undefined if {@link fromMap `fromMap`} {@link fromMapRange range} does not exist.
     */
    fromJsonCodecFix(): vscode.CodeAction | undefined {
        const range = this.fromMapRange();
        if (!range) return;
        const position = new vscode.Position(range.end.line + 1, 0);
        return this.provider.insertFix(position, 'Generate From JSON Codecs', this.fromJsonReplacement());
    }

    // Replacements.
    constructorReplacement(): string {
        const space = this.provider.start.isEmptyOrWhitespace ? '' : '\n';
        return '\n\t' + this.constructorBody() + space;
    }

    toStringMethodReplacement(): string {
        return '\n\t@override\n' + this.toStringMethod() + '\n';
    }

    fromMapReplacement(): string {
        return '\n' + this.fromMap() + '\n';
    }

    toMapReplacement(): string {
        return '\n' + this.toMap() + '\n';
    }

    fromJsonReplacement(): string {
        return '\n' + this.fromJsonCodec() + '\n';
    }

    toJsonReplacement(): string {
        return '\n' + this.toJsonCodec() + '\n';
    }

    updateChangesCommand(): vscode.CodeAction {
        return this.provider.command({
            command: UPDATE_DATA,
            title: 'Update All Changes',
            tooltip: 'This will update all members of the class',
        });
    }

    insertAllCommand(): vscode.CodeAction {
        return this.provider.command({
            command: GENERATE_DATA,
            title: 'Generate Class Data',
            tooltip: 'This will generate all members of the class',
        });
    }

    updateChanges() {
        const replacements: Replacement[] = [];
        const toStringRange = this.toStringMethodRange();
        const constructorRange = this.constructorRange();
        const fromMapRange = this.fromMapRange();
        const toMapRange = this.toMapRange();

        if (constructorRange && !this.hasEqualConstructor) {
            replacements.push({ range: constructorRange, value: '\t' + this.constructorBody() });
        }

        if (toStringRange && !this.hasEqualToStringMethod) {
            replacements.push({ range: toStringRange, value: this.toStringMethod() });
        }

        if (fromMapRange && !this.hasEqualFromMap) {
            replacements.push({ range: fromMapRange, value: this.fromMap() });
        }

        if (toMapRange && !this.hasEqualToMap) {
            replacements.push({ range: toMapRange, value: this.toMap() });
        }

        this.provider.replace(...replacements);
    }

    generateData() {
        const insertions: Insertion[] = [];
        if (!this.hasConvertImport) {
            insertions.push({ position: new vscode.Position(0, 0), value: "import 'dart:convert';\n\n" });
        }

        insertions.push(
            { position: this.provider.start.range.end, value: this.constructorReplacement() },
            {
                position: this.provider.endPositionWithinCode(),
                value: this.toStringMethodReplacement()
                    + this.fromMapReplacement()
                    + this.fromJsonReplacement()
                    + this.toMapReplacement()
                    + this.toJsonReplacement()
            }
        );

        this.provider.insert(...insertions);
    }
}
