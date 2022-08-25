import * as vscode from 'vscode';
import { DartCodeProvider } from '..';
import { DartCodeGenerator } from '../../../generators';
import { CodeActionValue } from '../../../interface';
import { ClassDataTemplate } from '../../../templates';
import { identicalCode } from '../../../utils';

export class FromJsonCodeAction implements CodeActionValue {
    value: string;
    position: vscode.Position;

    constructor(
        private provider: DartCodeProvider,
        element: ClassDataTemplate,
        position?: vscode.Position,
    ) {
        this.value = new DartCodeGenerator(element).writeFromJson().generate();
        this.position = position ?? provider.withinCode();
    }

    get key(): string {
        throw new Error('Method not implemented.');
    }

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get range(): vscode.Range | undefined {
        return this.provider.findCodeRange(this.value, this.provider.codeLines);
    }

    get insertion(): string {
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