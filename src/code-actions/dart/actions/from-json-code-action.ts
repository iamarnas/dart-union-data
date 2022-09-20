import * as vscode from 'vscode';
import { DartCodeProvider } from '..';
import { MapMethodGenerator } from '../../../generators';
import { CodeActionValue } from '../../../interface';
import { ClassDataTemplate } from '../../../templates';
import { identicalCode } from '../../../utils';

export class FromJsonCodeAction implements CodeActionValue {
    position: vscode.Position;
    value: string;

    constructor(
        private provider: DartCodeProvider,
        element: ClassDataTemplate,
        position?: vscode.Position,
    ) {
        this.value = new MapMethodGenerator(element).generateFromJson();
        this.position = position ?? provider.withinCode();
    }

    get key(): string {
        throw new Error('Method not implemented.');
    }

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get range(): vscode.Range | undefined {
        return this.provider.reader.findCodeRange(this.value, this.provider.range);
    }

    get insertion(): string {
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
            'Generate from JSON Codecs',
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