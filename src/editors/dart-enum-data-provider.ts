import * as vscode from 'vscode';
import { EnumDataGenerator } from '../generators';
import { ElementKind } from '../interface';
import { ClassDataTemplate } from '../templates';
import { identicalCode, regexp } from '../utils';
import { CodeValue, DartCodeProvider } from './dart-code-provider';

export class DartEnumDataProvider {
    private readonly enum: EnumDataGenerator;
    readonly extension: EnumExtensionCode;

    constructor(private provider: DartCodeProvider, private element: ClassDataTemplate) {
        if (element.kind !== ElementKind.enum) {
            console.error('Syntax error due to invalid element type');
        }

        this.enum = new EnumDataGenerator(element);
        this.extension = new EnumExtensionCode(provider, element);
    }

    checkersRange() {
        return this.provider.rangeFromTextLines(...this.checkersLines());
    }

    methodRanges(): vscode.Range[] {
        if (this.element.isEnhancedEnum) {
            return this.provider.whereCodeBlock(this.enum.methods, this.provider.codeLines);
        }

        return this.provider.whereCodeBlock(this.enum.methods);
    }

    methodsRange(): vscode.Range | undefined {
        return this.provider.mergeRanges(...this.methodRanges());
    }

    enumDataFix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.provider.endPositionWithinCode(),
            'Generate Enum Data',
            this.checkersAndMethods
        );
    }

    checkersFix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.provider.endPositionWithinCode(),
            'Generate Enum Checkers',
            '\n' + this.checkers.map((e) => e.replacement).join('')
        );
    }

    methodsFix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.provider.endPositionWithinCode(),
            'Generate Enum Methods',
            this.methods.map((e) => e.replacement).join('')
        );
    }

    private get checkersAndMethods(): string {
        const checkers = '\n' + this.checkers.map((e) => e.replacement).join('');
        const methods = this.methods.map((e) => e.replacement).join('');
        return checkers.concat(methods);
    }

    private checkersLines(): vscode.TextLine[] {
        if (this.element.isEnhancedEnum) {
            return this.provider.whereTextLine(this.enum.checkerElements, this.provider.codeLines);
        }

        return this.provider.whereTextLine(this.enum.checkerElements);
    }

    get checkers(): EnumCheckerCode[] {
        return this.enum.checkers.map((value) => new EnumCheckerCode(this.provider, value));
    }

    get methods(): EnumMehtodCode[] {
        if (this.element.isEnhancedEnum) {
            return this.enum.methods.map((value) => new EnumMehtodCode(
                this.provider,
                value,
                this.provider.lines,
            ));
        }

        return this.enum.methods.map((value) => new EnumMehtodCode(this.provider, value));
    }

    get values(): CodeValue[] {
        return [...this.checkers, ...this.methods, this.extension];
    }

    get isEmpty(): boolean {
        return this.element.enumMembers.length === 0;
    }

    get hasData(): boolean {
        return this.values.some((e) => e.isGenerated);
    }

    get hasCheckers(): boolean {
        return this.checkers.length !== 0 && this.checkers.some((e) => e.isGenerated);
    }

    get hasMethods(): boolean {
        return this.methods.length !== 0 && this.methods.some((e) => e.isGenerated);
    }
}

class EnumExtensionCode implements CodeValue {
    value: string;

    constructor(
        private provider: DartCodeProvider,
        private element: ClassDataTemplate,
    ) {
        this.value = new EnumDataGenerator(element).writeExtension().generate();
    }

    get position(): vscode.Position {
        const end = this.provider.editor.document.lineCount - 1;
        return this.provider.editor.document.lineAt(end).range.end;
    }

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get range(): vscode.Range | undefined {
        return this.provider.findCodeRange(this.value);
    }

    get replacement(): string {
        const textLine = this.provider.editor.document.lineAt(this.position);
        const spacing = textLine.isEmptyOrWhitespace ? '\n' : '\n\n';
        return spacing + this.value + '\n';
    }

    get isUpdated(): boolean {
        return identicalCode(
            this.value,
            this.provider.getText(this.range),
        );
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate Enum Extension',
            this.replacement,
        );
    }
}

class EnumCheckerCode implements CodeValue {
    constructor(private provider: DartCodeProvider, public value: string) { }

    get position(): vscode.Position {
        return this.range?.start
            ?? this.provider.endPositionWithinCode();
    }

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get range(): vscode.Range | undefined {
        return this.provider.lines.find((line) => {
            return !regexp.classMatch.test(line.text) && line.text.includes(this.value);
        })?.range;
    }

    get replacement(): string {
        return '\t' + this.value + '\n';
    }

    get isUpdated(): boolean {
        return identicalCode(
            this.value,
            this.provider.getText(this.range),
        );
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate Enum Checker',
            this.replacement,
        );
    }
}

class EnumMehtodCode implements CodeValue {
    constructor(
        private provider: DartCodeProvider,
        public value: string,
        private lines?: vscode.TextLine[],
    ) { }

    get range(): vscode.Range | undefined {
        return this.provider.findCodeRange(this.value, this.lines);
    }

    get position(): vscode.Position {
        return this.range?.start ?? this.provider.endPositionWithinCode();
    }

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get replacement(): string {
        return '\n' + this.value + '\n';
    }

    get isUpdated(): boolean {
        return identicalCode(
            this.value,
            this.provider.getText(this.range),
        );
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate Enum Method',
            this.replacement,
        );
    }
}