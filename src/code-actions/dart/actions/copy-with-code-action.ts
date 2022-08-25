import * as vscode from 'vscode';
import { DartCodeProvider } from '..';
import { CopyWithGenerator } from '../../../generators';
import { ActionValue, CodeActionValue } from '../../../interface';
import { ClassDataTemplate } from '../../../templates';
import { identicalCode } from '../../../utils';

export class CopyWithCodeAction implements CodeActionValue {
    readonly method: CopyWithMethodCodeAction;
    readonly getter: CopyWithGetterCodeAction;
    readonly interface: CopyWithInterfaceCodeAction;
    readonly implementation: CopyWithImplementionCodeAction;
    readonly useAccurateCopyWith: boolean;

    constructor(private provider: DartCodeProvider, element: ClassDataTemplate) {
        const generated = new CopyWithGenerator(element);
        this.useAccurateCopyWith = element.settings.useAccurateCopyWith;
        this.method = new CopyWithMethodCodeAction(provider, generated.method);
        this.getter = new CopyWithGetterCodeAction(provider, generated.getter);
        this.interface = new CopyWithInterfaceCodeAction(provider, generated.interface);
        this.implementation = new CopyWithImplementionCodeAction(provider, generated.implementation);
    }

    get itemsWithoutGetter(): CodeActionValue[] {
        if (!this.useAccurateCopyWith) return [this.method];
        return [this.interface, this.implementation];
    }

    get items(): CodeActionValue[] {
        return [this.getter, ...this.itemsWithoutGetter];
    }

    get key(): string {
        throw new Error('Method not implemented.');
    }

    /**
     * The value of the `copyWith` implementation. 
     * The {@link getter} value will not be included in this value 
     * due to the need to be separated from the `copywith` implementation.
     */
    get value(): string {
        return this.itemsWithoutGetter.map((item) => item.value).join('');
    }

    /**
     * The `copyWith` replacement without {@link getter} value
     * if {@link useAccurateCopyWith accurate} mode enabled.
     */
    get insertion(): string {
        return this.itemsWithoutGetter.map((item) => item.insertion).join('');
    }

    /**
     * The `copyWith` position without {@link getter} position.
     * If {@link useAccurateCopyWith accurate} mode is enabled returns position within class,
     * otherwise outside the class.
     */
    get position(): vscode.Position {
        return this.itemsWithoutGetter.map((item) => item.position)[0];
    }

    get isGenerated(): boolean {
        return this.items.every((item) => item.isGenerated);
    }

    get isUpdated(): boolean {
        return this.items.every((item) => item.isUpdated);
    }

    /**
     * The `copyWith` range without {@link getter} range.
     * If {@link useAccurateCopyWith accurate} mode is enabled returns {@link method} range,
     * otherwise union range of the {@link interface} and {@link implementation}.
     */
    get range(): vscode.Range | undefined {
        const ranges = this.itemsWithoutGetter.map((item) => item.range);
        return ranges[0]?.with({ end: ranges[ranges.length - 1]?.end });
    }

    /**
     * The `copyWith` fix without {@link getter} replacement.
     * If {@link useAccurateCopyWith accurate} mode is enabled returns {@link method} replacement,
     * otherwise {@link interface} and {@link implementation} replacement outside of the class.
     */
    fix(): vscode.CodeAction {
        if (!this.useAccurateCopyWith) return this.method.fix();
        return this.provider.insertFix(
            this.position,
            'Generate CopyWith (Accurate)',
            this.insertion,
        );
    }

    update() {
        this.provider.replace(...this.items);
    }

    delete(): void {
        this.provider.delete(this);
    }
}

class CopyWithMethodCodeAction implements CodeActionValue {
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
        return this.provider.findCodeRange(this.value, this.provider.codeLines);
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate CopyWith Method',
            this.insertion,
        );
    }

    update() {
        this.provider.replace(this);
    }

    delete(): void {
        this.provider.delete(this);
    }
}

class CopyWithGetterCodeAction implements CodeActionValue {
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
        return this.provider.findCodeRange(this.value, this.provider.codeLines);
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate CopyWith Getter',
            this.insertion,
        );
    }

    update() {
        this.provider.replace(this);
    }

    delete(): void {
        this.provider.delete(this);
    }
}

class CopyWithInterfaceCodeAction implements CodeActionValue {
    constructor(private provider: DartCodeProvider, private action: ActionValue) { }

    get key(): string {
        return this.action.key;
    }

    get value(): string {
        return this.action.value;
    }

    get insertion(): string {
        if (this.provider.lineAt(this.position.line).isEmptyOrWhitespace) {
            return this.insertion;
        }

        return '\n' + this.insertion;
    }

    get position(): vscode.Position {
        return this.provider.end;
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
        return this.provider.findCodeRange(this.value);
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate CopyWith Interface',
            this.insertion,
        );
    }

    update() {
        this.provider.replace(this);
    }

    delete(): void {
        this.provider.delete(this);
    }
}

class CopyWithImplementionCodeAction implements CodeActionValue {
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
        return this.provider.end;
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
        return this.provider.findCodeRange(this.value);
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate CopyWith Implemention',
            this.insertion,
        );
    }

    update() {
        this.provider.replace(this);
    }

    delete(): void {
        this.provider.delete(this);
    }
}