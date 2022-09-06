import * as vscode from 'vscode';
import { DartCodeProvider } from '..';
import { EnumDataGenerator } from '../../../generators/enum.generator';
import { ActionValue, CodeActionValue } from '../../../interface';
import { ClassDataTemplate } from '../../../templates';
import '../../../types/array';
import { identicalCode } from '../../../utils';

export class EnumCodeActionData {
    readonly extension: EnumExtensionCodeAction;
    readonly checkers: CodeActionValue[];
    readonly methods: CodeActionValue[];
    private readonly checkerElements: string[] = [];

    constructor(private provider: DartCodeProvider, element: ClassDataTemplate) {
        const generated = new EnumDataGenerator(element);
        this.checkerElements = generated.checkerElements;
        this.extension = new EnumExtensionCodeAction(provider, generated);
        this.checkers = generated.checkers.map((action) => new EnumCheckerCodeAction(provider, action));
        this.methods = generated.methods.map((action) => new MethodCodeAction(provider, action));
    }

    get items(): CodeActionValue[] {
        return [...this.checkers, ...this.methods];
    }

    get hasChecker(): boolean {
        return this.checkers.some((e) => e.isGenerated);
    }

    get hasMethod(): boolean {
        return this.methods.some((e) => e.isGenerated);
    }

    get hasAnyData(): boolean {
        return this.hasChecker || this.hasMethod;
    }

    get actions(): vscode.CodeAction[] {
        const buffer: vscode.CodeAction[] = [];

        if (this.extension.isGenerated) {
            return this.extension.actions;
        }

        if (!this.hasChecker) {
            buffer.push(this.checkersFix());
        }

        if (!this.hasMethod) {
            buffer.push(this.methodsFix());
        }

        if (!this.hasAnyData) {
            buffer.push(this.dataFix());
            buffer.push(this.extension.fix());
        }

        buffer.push(...this.methods.filter((e) => !e.isGenerated).map((e) => e.fix()));

        return buffer;
    }

    /**
     * Items to need remove.
     */
    get removals(): vscode.TextLine[] {
        return this.generatedCheckers.filter((line) => {
            return !this.checkers.some((e) => e.range?.isEqual(line.range));
        });
    }

    /**
     * Items to need insert.
     * Due to some items have no body and must be inserted instead of updating.
     */
    get insertions(): CodeActionValue[] {
        if (this.generatedCheckers.length === 0) return [];
        return this.checkers.filter((e) => !e.isGenerated);
    }

    /**
     * Items to need replace (update).
     */
    get replacements(): CodeActionValue[] {
        return this.items.filter((e) => e.isGenerated && !e.isUpdated);
    }

    get hasChanges(): boolean {
        return this.replacements.length !== 0
            || this.insertions.length !== 0
            || this.removals.length !== 0;
    }

    private get generatedCheckers(): vscode.TextLine[] {
        return this.provider.reader.whereTextLine(this.checkerElements, this.provider.lines);
    }

    private checkersFix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.provider.withinCode(),
            'Generate Enum Checkers',
            '\n' + this.checkers.map((e) => e.value).join('\n') + '\n'
        );
    }

    private methodsFix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.provider.withinCode(),
            'Generate Enum Methods',
            this.methods.map((e) => e.insertion).join('')
        );
    }

    private dataFix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.provider.withinCode(),
            'Generate Enum Data',
            '\n' + this.checkers.map((e) => e.value).join('\n') + '\n'
            + this.methods.map((e) => e.insertion).join('')
        );
    }
}

class EnumCheckerCodeAction implements CodeActionValue {
    constructor(
        private provider: DartCodeProvider,
        private action: ActionValue,
        private within?: vscode.Range,
    ) { }

    get key(): string {
        return this.action.key;
    }

    get value(): string {
        return this.action.value;
    }

    get insertion(): string {
        return this.action.insertion;
    }

    /**
     * The `enum` checker elements that match all checkers for the same instance`.
     */
    get elements(): string[] {
        return this.value.slice(0, this.value.lastIndexOf('.'))
            .split(/\s+/)
            .filter((e) => !e.startsWith('is'))
            .concat(';');
    }

    get position(): vscode.Position {
        // Search after generated enum checker. Search in the given range (this.within) otherwise in the selected class.
        const generated = this.provider.reader.whereTextLine(this.elements, this.within ?? this.provider.range).pop();
        // Given range end.
        const end = this.within?.end;
        // Generated current start position.
        if (this.range) return this.range.start;
        // The last generated values end position.
        if (generated) return generated.range.end;
        // If there are no checkers, place it inside the given code, otherwise select code.
        return end?.with({ character: end.character - 1 }) ?? this.provider.withinCode();
    }

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get isUpdated(): boolean {
        return identicalCode(
            this.value,
            this.provider.reader.getText(this.range),
        );
    }

    get range(): vscode.Range | undefined {
        if (this.within) return this.provider.reader.whereTextLine([this.key], this.within).at(0)?.range;
        return this.provider.reader.whereTextLine([this.key], this.provider.lines).at(0)?.range;
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate Enum Checker',
            this.insertion,
        );
    }

    async update(): Promise<void> {
        await this.provider.replace(this);
    }

    async delete(): Promise<void> {
        await this.provider.delete(this);
    }
}

class MethodCodeAction implements CodeActionValue {
    constructor(
        private provider: DartCodeProvider,
        private action: ActionValue,
        private within?: vscode.Range,
    ) { }

    get key(): string {
        return this.action.key;
    }

    get value(): string {
        return this.action.value;
    }

    get insertion(): string {
        return this.action.insertion;
    }

    get position(): vscode.Position {
        if (this.range) return this.range.start;
        // Try to get specified code end, otherwise default.
        return this.within?.end.with({ character: this.within.end.character - 1 }) ?? this.provider.withinCode();
    }

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get isUpdated(): boolean {
        return identicalCode(
            this.value,
            this.provider.reader.getText(this.range),
        );
    }

    get range(): vscode.Range | undefined {
        const withinRange = this.within ?? this.provider.range;
        return this.provider.reader.whereCodeFirstLine((line) => line.text.includes(this.key), withinRange);
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            `Generate Method (${this.key.slice(0, -1)})`,
            this.insertion,
        );
    }

    async update(): Promise<void> {
        await this.provider.replace(this);
    }

    async delete(): Promise<void> {
        await this.provider.delete(this);
    }
}

class EnumExtensionCodeAction implements CodeActionValue {
    constructor(private provider: DartCodeProvider, private generator: EnumDataGenerator) { }

    /**
     * The key corresponding to the name of the extension (first line of the value).
     */
    get key(): string {
        return this.generator.extension.key;
    }

    get value(): string {
        return this.generator.extension.value;
    }

    get insertion(): string {
        return this.generator.extension.insertion;
    }

    get position(): vscode.Position {
        return this.range?.start ?? this.provider.eol;
    }

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get isUpdated(): boolean {
        return this.isGenerated
            && this.removals.length === 0
            && this.insertions.length === 0
            && this.replacements.length === 0;
    }

    get hasChanges(): boolean {
        return this.removals.length !== 0
            || this.insertions.length !== 0
            || this.replacements.length !== 0;
    }

    get range(): vscode.Range | undefined {
        // The generated enum name.
        const name = this.key.slice(this.key.lastIndexOf('on ') + 2, this.key.lastIndexOf('{')).trim();
        // The dynamic search to define extension range even if the user modified extension name.
        return this.provider.reader.whereCodeFirstLine((line) => {
            return line.text.trimStart().startsWith('extension ')
                && line.text.includesAll('on ', name)
                && line.text.trimEnd().endsWith('{');
        });
    }

    get lines(): vscode.TextLine[] {
        return this.provider.reader.rangeToLines(this.range);
    }

    get checkers(): CodeActionValue[] {
        if (!this.range) return [];
        return this.generator.checkers.map((action) => new EnumCheckerCodeAction(this.provider, action, this.range));
    }

    get methods(): CodeActionValue[] {
        if (!this.range) return [];
        return this.generator.methods.map((action) => new MethodCodeAction(this.provider, action, this.range));
    }

    get items(): CodeActionValue[] {
        return [...this.checkers, ...this.methods];
    }

    get withinCode(): vscode.Position {
        const end = this.range?.end;
        return end?.with({ character: end.character - 1 }) ?? this.provider.withinCode();
    }

    get hasChecker(): boolean {
        return this.checkers.some((e) => e.isGenerated);
    }

    get hasMethod(): boolean {
        return this.methods.some((e) => e.isGenerated);
    }

    get hasAnyData(): boolean {
        return this.hasChecker || this.hasMethod;
    }

    /**
     * Items to need remove.
     */
    get removals(): vscode.TextLine[] {
        return this.generatedCheckers.filter((line) => {
            return !this.checkers.some((e) => e.range?.isEqual(line.range));
        });
    }

    /**
     * Items to need insert.
     * Due to some items have no body and must be inserted instead of updating.
     */
    get insertions(): CodeActionValue[] {
        if (this.generatedCheckers.length === 0) return [];
        return this.checkers.filter((e) => !e.isGenerated);
    }

    /**
     * Items to need replace (update).
     */
    get replacements(): CodeActionValue[] {
        return this.items.filter((e) => e.isGenerated && !e.isUpdated);
    }

    private get generatedCheckers(): vscode.TextLine[] {
        if (!this.isGenerated) return [];
        return this.provider.reader.whereTextLine(this.generator.checkerElements, this.lines);
    }

    private checkersFix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.withinCode,
            'Generate Enum Checkers',
            '\n' + this.checkers.map((e) => e.value).join('\n') + '\n'
        );
    }

    private methodsFix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.withinCode,
            'Generate Enum Methods',
            this.methods.map((e) => e.insertion).join('')
        );
    }

    private dataFix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.withinCode,
            'Generate Enum Data',
            '\n' + this.checkers.map((e) => e.value).join('\n') + '\n'
            + this.methods.map((e) => e.insertion).join('')
        );
    }

    get actions(): vscode.CodeAction[] {
        const buffer: vscode.CodeAction[] = [];

        if (!this.isGenerated) return buffer.concat(this.fix());

        if (!this.hasChecker) {
            buffer.push(this.checkersFix());
        }

        if (!this.hasMethod) {
            buffer.push(this.methodsFix());
        }

        if (!this.hasAnyData) {
            buffer.push(this.dataFix());
        }

        buffer.push(...this.methods.filter((e) => !e.isGenerated).map((e) => e.fix()));

        return buffer;
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate Enum Extension',
            this.insertion,
        );
    }

    async update(): Promise<void> {
        await this.provider.replace(this);
    }

    async delete(): Promise<void> {
        await this.provider.delete(this);
    }
}