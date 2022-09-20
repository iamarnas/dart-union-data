import * as vscode from 'vscode';
import { DartCodeProvider } from '..';
import { ActionValue, CodeActionValue } from '../../../interface';
import { identicalCode } from '../../../utils';

export class ToStringCodeAction implements CodeActionValue {
    constructor(private provider: DartCodeProvider, private action: ActionValue) { }

    get value(): string {
        return '\t' + this.action.value;
    }

    get key(): string {
        return this.action.key;
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
            this.provider.getText(this.range),
        );
    }

    get range(): vscode.Range | undefined {
        return this.provider.reader.findCodeRange(this.key, this.provider.range);
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate to String Method',
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