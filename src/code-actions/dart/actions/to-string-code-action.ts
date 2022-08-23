import * as vscode from 'vscode';
import { DartCodeProvider } from '..';
import { ToStringMethodGenerator } from '../../../generators';
import { CodeActionValue } from '../../../interface';
import { ClassDataTemplate } from '../../../templates';
import { identicalCode } from '../../../utils';

export class ToStringCodeAction implements CodeActionValue {
    value: string;

    constructor(private provider: DartCodeProvider, element: ClassDataTemplate) {
        this.value = new ToStringMethodGenerator(element).value;
    }

    get insertion(): string {
        return '\n\t@override\n' + this.value + '\n';
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
        return this.provider.findCodeRange('String toString() ', this.provider.codeLines);
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate to String Method',
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