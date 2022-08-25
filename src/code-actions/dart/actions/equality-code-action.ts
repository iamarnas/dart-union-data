import * as vscode from 'vscode';
import { DartCodeProvider } from '..';
import { EqualityGenerator } from '../../../generators';
import { ActionValue, CodeActionValue } from '../../../interface';
import { ClassDataTemplate } from '../../../templates';
import '../../../types/array';
import { identicalCode } from '../../../utils';

export class EqualityCodeAction implements CodeActionValue {
    readonly operator: EqualityOperatorCodeAction;
    readonly hashCode: HashCodeAction;
    readonly equatable: EquatableCodeAction;
    readonly deepEquality: DeepEqualityCodeAction;
    readonly useEquatable: boolean;
    readonly useDeepEquality: boolean;

    constructor(private provider: DartCodeProvider, element: ClassDataTemplate) {
        const generated = new EqualityGenerator(element);
        this.useEquatable = element.settings.useEquatable;
        this.useDeepEquality = element.settings.useDeepEquality;
        this.operator = new EqualityOperatorCodeAction(provider, generated.operator);
        this.hashCode = new HashCodeAction(provider, generated.hashCode);
        this.equatable = new EquatableCodeAction(provider, generated.equatable);
        this.deepEquality = new DeepEqualityCodeAction(provider, generated.deepEquality);
    }

    get key(): string {
        return this.items.map((e) => e.key)[0];
    }

    get items(): CodeActionValue[] {
        if (this.useEquatable) return [this.equatable];
        if (this.useDeepEquality) return [this.deepEquality, this.hashCode];
        return [this.operator, this.hashCode];
    }

    get value(): string {
        return this.items.map((item) => item.value).join('');
    }

    get insertion(): string {
        return this.items.map((item) => item.insertion).join('');
    }

    get position(): vscode.Position {
        return this.provider.withinCode();
    }

    get isGenerated(): boolean {
        return this.items.every((item) => item.isGenerated);
    }

    get isUpdated(): boolean {
        return this.items.every((item) => item.isUpdated);
    }

    get range(): vscode.Range | undefined {
        return this.items[0].range?.with({ end: this.items.reverse()[0].range?.end });
    }

    fix(): vscode.CodeAction {
        if (this.useEquatable) return this.equatable.fix();
        return this.provider.insertFix(
            this.position,
            'Generate Equality Operator',
            this.insertion,
        );
    }

    update(): void {
        this.provider.replace(...this.items);
    }

    delete(): void {
        this.provider.delete(this);
    }
}

class EqualityOperatorCodeAction implements CodeActionValue {
    constructor(private provider: DartCodeProvider, private action: ActionValue) { }

    get key(): string {
        return this.action.key;
    }

    get value(): string {
        return this.action.value;
    }

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get range(): vscode.Range | undefined {
        return this.provider.findCodeRange('bool operator ==(', this.provider.codeLines);
    }

    get position(): vscode.Position {
        return this.provider.withinCode();
    }

    get insertion(): string {
        return this.action.insertion;
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
            'Generate Equality Operator',
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

class HashCodeAction implements CodeActionValue {
    constructor(private provider: DartCodeProvider, private action: ActionValue) { }

    get key(): string {
        return this.action.key;
    }

    get value(): string {
        return this.action.value;
    }

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get range(): vscode.Range | undefined {
        const startLine = this.provider.whereTextLine(['int get hashCode => '], this.provider.codeLines).at(0);

        if (!startLine) return;

        const lastLine = this.provider.rangeWhere(startLine.range.start, (line) => line.text.trimEnd().endsWith(';'));

        if (!lastLine) return;

        return startLine?.range.with({ end: lastLine.end });
    }

    get position(): vscode.Position {
        return this.provider.withinCode();
    }

    get insertion(): string {
        return this.action.insertion;
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
            'Generate HashCode',
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

class EquatableCodeAction implements CodeActionValue {
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

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get position(): vscode.Position {
        return this.provider.withinCode();
    }

    get range(): vscode.Range | undefined {
        const startLine = this.provider.whereTextLine(['List<Object?> get props => '], this.provider.codeLines).at(0);

        if (!startLine) return;

        const lastLine = this.provider.rangeWhere(startLine.range.start, (line) => line.text.trimEnd().endsWith(';'));

        if (!lastLine) return;

        return startLine.range.with({ end: lastLine.end });
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
            'Generate Equatable Equality',
            '\n\t@override\n' + this.insertion,
        );
    }

    update() {
        this.provider.replace(this);
    }

    delete(): void {
        this.provider.delete(this);
    }
}

class DeepEqualityCodeAction implements CodeActionValue {
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

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get range(): vscode.Range | undefined {
        return this.provider.findCodeRange('bool operator ==(', this.provider.codeLines);
    }

    get position(): vscode.Position {
        return this.provider.withinCode();
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
            'Generate Equality Operator',
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