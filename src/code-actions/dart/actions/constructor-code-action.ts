import * as vscode from 'vscode';
import { DartCodeProvider } from '..';
import { DartCodeGenerator } from '../../../generators';
import { CodeActionValue } from '../../../interface';
import { ClassDataTemplate } from '../../../templates';
import { identicalCode } from '../../../utils';

export class ConstructorCodeAction implements CodeActionValue {
    value: string;

    constructor(private provider: DartCodeProvider, private element: ClassDataTemplate) {
        this.value = '\t' + new DartCodeGenerator(element).writeConstructor().generate();
    }

    get key(): string {
        throw new Error('Method not implemented.');
    }

    get insertion(): string {
        const space = this.provider.start.isEmptyOrWhitespace ? '' : '\n';
        return '\n' + this.value + space;
    }

    get position(): vscode.Position {
        return this.provider.start.range.end;
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
        return this.provider.whereCodeFirstLine((line) => {
            return line.text.indexOf(`${this.element.name}(`) !== -1
                && !line.text.includesOne('toString()', '=>', 'return', 'factory');
        }, this.provider.codeLines);
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate Contructor',
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