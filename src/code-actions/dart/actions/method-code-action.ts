import * as vscode from 'vscode';
import { DartCodeProvider } from '..';
import { ActionValue, CodeActionValue } from '../../../interface';
import { identicalCode } from '../../../utils';

export class MethodCodeAction implements CodeActionValue {
    constructor(
        private provider: DartCodeProvider,
        private action: ActionValue,
        private searchIn?: vscode.Range,
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
        return this.searchIn?.end.with({ character: this.searchIn.end.character - 1 }) ?? this.provider.withinCode();
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
        const withinRange = this.searchIn ?? this.provider.range;
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