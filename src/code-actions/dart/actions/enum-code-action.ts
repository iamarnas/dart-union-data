import * as vscode from 'vscode';
import { DartCodeProvider } from '..';
import { EnumDataGenerator } from '../../../generators/enum.generator';
import { ActionValue, CodeActionValue } from '../../../interface';
import { ClassDataTemplate } from '../../../templates';
import { identicalCode } from '../../../utils';

export class EnumCodeAction {
    readonly extension: EnumExtensionCodeAction;
    readonly checkers: EnumCheckerCodeAction[];
    readonly methods: EnumMethodCodeAction[];

    constructor(private provider: DartCodeProvider, element: ClassDataTemplate) {
        const generated = new EnumDataGenerator(element);
        this.extension = new EnumExtensionCodeAction(provider, generated.extension);
        this.checkers = generated.checkers.map((e) => new EnumCheckerCodeAction(provider, e));
        this.methods = generated.methods.map((e) => new EnumMethodCodeAction(provider, e));
    }

    checkersFix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.provider.withinCode(),
            'Generate Enum Checkers',
            '\n' + this.checkers.map((e) => e.value).join('\n') + '\n'
        );
    }

    methodsFix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.provider.withinCode(),
            'Generate Enum Methods',
            this.methods.map((e) => e.insertion).join('')
        );
    }
}

class EnumCheckerCodeAction implements CodeActionValue {
    constructor(private provider: DartCodeProvider, private action: ActionValue) { }

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
        return this.provider.findCodeRange(this.value, this.provider.codeLines);
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
        return this.provider.findCodeRange(this.value);
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