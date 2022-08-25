import * as vscode from 'vscode';
import { DartCodeProvider } from '..';
import { EnumDataGenerator } from '../../../generators/enum.generator';
import { ActionValue, CodeActionValue } from '../../../interface';
import { ClassDataTemplate } from '../../../templates';
import { identicalCode } from '../../../utils';

export class EnumCodeActionData {
    readonly extension: EnumExtensionCodeAction;
    readonly checkers: EnumCheckerCodeAction[];
    readonly methods: EnumMethodCodeAction[];
    private readonly checkerElements: string[] = [];

    constructor(private provider: DartCodeProvider, private element: ClassDataTemplate) {
        const generated = new EnumDataGenerator(element);
        this.checkerElements = generated.checkerElements;
        this.extension = new EnumExtensionCodeAction(provider, generated.extension);
        this.checkers = generated.checkers.map((e) => new EnumCheckerCodeAction(provider, e));
        this.methods = generated.methods.map((e) => new EnumMethodCodeAction(provider, e));
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
        return this.extension.isGenerated || this.hasChecker || this.hasMethod;
    }

    get actions(): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = [];

        if (!this.element.isEnhancedEnum) {
            return actions.concat(this.extension.fix());
        }

        if (!this.hasChecker) {
            actions.push(this.checkersFix());
        }

        if (!this.hasMethod) {
            actions.push(this.methodsFix());
        }

        if (!this.hasAnyData) {
            actions.push(this.dataFix());
            actions.push(this.extension.fix());
        }

        return actions;
    }

    /**
     * Items to need remove.
     */
    get removals(): vscode.TextLine[] {
        return this.generatedCheckers.filter((line) => {
            return !this.checkers.some((e) => e.range?.contains(line.range));
        });
    }

    /**
     * Items to need insert.
     * Due to some items have no body and must be inserted instead of updating.
     */
    get insertions(): CodeActionValue[] {
        return this.generatedCheckers.length === 0
            ? []
            : this.checkers.filter((e) => !e.isGenerated);
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
        return this.provider.whereTextLine(this.checkerElements, this.provider.codeLines);
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
    constructor(private provider: DartCodeProvider, private action: ActionValue) { }

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
        const elements = this.value.slice(0, this.value.lastIndexOf('.'))
            .split(/\s+/).filter((e) => !e.startsWith('is'))
            .concat(';');
        const line = this.provider.whereTextLine(elements, this.provider.codeLines).reverse().at(0);

        // Generated current start position.
        if (this.range) return this.range.start;
        // The last generated values end position.
        if (line) return line.range.end;
        // If there are no checkers, place inside the code.
        return this.provider.withinCode();
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
        return this.provider.whereTextLine([this.value], this.provider.codeLines).at(0)?.range;
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate Enum Checker',
            this.insertion,
        );
    }

    update(): void {
        this.provider.replace(this);
    }

    delete(): void {
        this.provider.delete(this);
    }
}

class EnumMethodCodeAction implements CodeActionValue {
    constructor(private provider: DartCodeProvider, private action: ActionValue) { }

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
        return this.range?.start ?? this.provider.withinCode();
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
        return this.provider.whereCodeFirstLine((line) => line.text.includes(this.key), this.provider.codeLines);
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate Enum Method',
            this.insertion,
        );
    }

    update(): void {
        this.provider.replace(this);
    }

    delete(): void {
        this.provider.delete(this);
    }
}

class EnumExtensionCodeAction implements CodeActionValue {
    constructor(private provider: DartCodeProvider, private action: ActionValue) { }

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
        return this.range?.start ?? this.provider.eol;
    }

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get isUpdated(): boolean {
        return identicalCode(
            this.value,
            this.provider.getText(this.range),
        );
    }

    get range(): vscode.Range | undefined {
        // The generated enum name.
        const name = this.key.slice(this.key.lastIndexOf('on ') + 2, this.key.lastIndexOf('{')).trim();
        // The dynamic search to define extension range even if the user modified extension name.
        return this.provider.whereCodeFirstLine((line) => {
            return line.text.trimStart().startsWith('extension ')
                && line.text.trimEnd().endsWith('{')
                && line.text.includesAll('on ', name);
        });
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate Enum Extension',
            this.insertion,
        );
    }

    update(): void {
        this.provider.replace(this);
    }

    delete(): void {
        this.provider.delete(this);
    }
}