import * as vscode from 'vscode';
import { EnumDataGenerator } from '../../generators';
import { ElementKind } from '../../interface';
import { ClassDataTemplate } from '../../templates';
import { identicalCode } from '../../utils';
import { CodeValue, DartCodeProvider } from './dart-code-provider';

export const UPDATE_ENUM_COMMAND = 'update.enum.data';

export class DartEnumDataProvider {
    private readonly enum: EnumDataGenerator;
    readonly extension: EnumExtensionCode;

    constructor(private provider: DartCodeProvider, private element: ClassDataTemplate) {
        if (element.kind !== ElementKind.enum) {
            console.error('DartEnumDataProvider: Syntax error due to invalid element type');
        }

        this.enum = new EnumDataGenerator(element);
        this.extension = new EnumExtensionCode(provider, element);
    }

    checkersRange() {
        return this.provider.rangeFromTextLines(...this.previousCheckers);
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

    updateChanges() {
        const editor = this.provider.editor;
        if (!editor || this.provider.document.languageId !== 'dart') return;

        if (this.element.isEnhancedEnum) {
            if (this.extension.isGenerated && !this.extension.isUpdated) {
                this.extension.update();
                return;
            }

            let lineNumber = this.previousCheckers[this.previousCheckers.length - 1].range?.end.line
                ?? this.provider.endPositionWithinCode().line;

            if (this.hasCheckers) {
                editor.edit((builder) => {
                    // Insertion.
                    if (this.checkers.length >= this.previousCheckers.length) {
                        for (let i = 0; i < this.checkers.length; i++) {
                            const curr = this.checkers[i];

                            if (i <= this.previousCheckers.length - 1) {
                                const prev = this.previousCheckers[i];

                                if (!prev.text.includes(curr.value)) {
                                    builder.replace(prev.range, '\t' + curr.value);
                                }

                                continue;
                            }

                            if (i > this.previousCheckers.length - 1) {
                                lineNumber++;
                                builder.insert(this.provider.lineAt(lineNumber).range.start, curr.replacement);
                            }
                        }
                    }

                    // Removing.
                    if (this.checkers.length < this.previousCheckers.length) {
                        for (let i = 0; i < this.previousCheckers.length; i++) {
                            const prev = this.previousCheckers[i];

                            if (i <= this.checkers.length - 1) {
                                const curr = this.checkers[i];

                                if (!prev.text.includes(curr.value)) {
                                    builder.replace(prev.range, '\t' + curr.value);
                                }

                                continue;
                            }

                            const start = this.provider.lineAt(prev.range.start.line - 1).range.end;
                            builder.delete(new vscode.Range(start, prev.range.end));
                        }
                    }

                    for (const method of this.methods) {
                        if (method.range) {
                            builder.replace(method.range, method.value);
                        }
                    }
                });
            }

            return;
        }

        this.extension.update();
    }

    updateCommand(...args: any[]): vscode.CodeAction {
        return this.provider.command({
            command: UPDATE_ENUM_COMMAND,
            title: 'Update All Changes',
            tooltip: 'This will update all enum members',
            arguments: args,
        });
    }

    private get checkersAndMethods(): string {
        const checkers = '\n' + this.checkers.map((e) => e.replacement).join('');
        const methods = this.methods.map((e) => e.replacement).join('');
        return checkers.concat(methods);
    }

    private get previousCheckers(): vscode.TextLine[] {
        if (this.element.isEnhancedEnum) {
            return this.provider.whereTextLine(this.enum.checkerElements, this.provider.codeLines);
        }

        return this.provider.whereTextLine(this.enum.checkerElements);
    }

    get checkers(): EnumCheckerCode[] {
        return this.enum.checkers.map((value) => new EnumCheckerCode(this.provider, value));
    }

    get hasCheckers(): boolean {
        return this.previousCheckers.length !== 0;
    }

    get methods(): EnumMehtodCode[] {
        if (this.element.isEnhancedEnum) {
            return this.enum.methods.map((value) => new EnumMehtodCode(
                this.provider,
                value,
                this.provider.codeLines,
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
        return this.hasCheckers || this.hasMethods;
    }

    get hasMethods(): boolean {
        return this.methods.filter((e) => e.isGenerated).length !== 0;
    }

    get hasChanges(): boolean {
        return this.values.filter((e) => e.isGenerated).some((e) => !e.isUpdated)
            || this.hasCheckers && this.checkers.length !== this.previousCheckers.length
            || this.hasCheckers && this.checkers.some((e) => !e.isUpdated);
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
        const end = this.provider.document.lineCount - 1;
        return this.provider.document.lineAt(end).range.end;
    }

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get range(): vscode.Range | undefined {
        return this.provider.findCodeRange(this.value);
    }

    get replacement(): string {
        const textLine = this.provider.document.lineAt(this.position);
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

    update() {
        this.provider.replace(this);
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
        const lines = this.provider.whereTextLine([this.value]);
        return lines.length !== 0 ? lines[0].range : undefined;
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

    update() {
        this.provider.replace(this);
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

    update() {
        this.provider.replace(this);
    }
}