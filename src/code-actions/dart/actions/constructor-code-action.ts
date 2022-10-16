import * as vscode from 'vscode';
import { DartCodeProvider } from '..';
import { GenerativeConstructorGenerator, SuperConstructorGenerator } from '../../../generators';
import { CodeActionValue } from '../../../interface';
import { ClassDataTemplate, SubclassTemplate } from '../../../templates';
import '../../../types/string';
import { identicalCode } from '../../../utils';

export class ConstructorCodeAction implements CodeActionValue {
    readonly generative: GenerativeConstructorCodeAction;
    readonly super: SuperConstructorCodeAction | undefined;

    constructor(private provider: DartCodeProvider, element: SubclassTemplate | ClassDataTemplate) {
        this.generative = new GenerativeConstructorCodeAction(provider, new GenerativeConstructorGenerator(element));

        if (this.generative.range !== undefined) {
            this.super = new SuperConstructorCodeAction(provider, new SuperConstructorGenerator(element), this.generative.range.end);
        }
    }

    get length(): number {
        return !this.super
            ? this.generative.value.length
            : this.generative.value.length + this.super.value.length;
    }

    get key(): string {
        return this.generative.key;
    }

    get value(): string {
        return !this.super?.isGenerated
            ? this.generative.value
            : this.generative.value + this.super.value;
    }

    get insertion(): string {
        return !this.super?.isGenerated
            ? this.generative.insertion
            : this.generative.insertion + this.super.insertion;
    }

    get position(): vscode.Position {
        return this.generative.position;
    }

    get isGenerated(): boolean {
        return this.super?.isGenerated
            ? this.super.isGenerated && this.generative.isGenerated
            : this.generative.isGenerated;
    }

    get isUpdated(): boolean {
        return this.generative.isUpdated;
    }

    get range(): vscode.Range | undefined {
        return this.generative.range?.with({ end: this.super?.range?.end });
    }

    get replacements(): CodeActionValue[] {
        return [];
    }

    get isBlockBody(): boolean {
        return this.provider.reader.rangeToLines(this.range).some((e) => e.text.trimEnd().endsWith(','));
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate Contructor',
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

class GenerativeConstructorCodeAction implements CodeActionValue {
    constructor(private provider: DartCodeProvider, private action: GenerativeConstructorGenerator) { }

    get key(): string {
        return this.action.key.trim();
    }

    get value(): string {
        const initial = this.action.asBlock({ auto: true }).asInitial().value;
        if (!this.range) return initial;
        const current = this.action.refactor(this.provider.document.getText(this.range)).value;
        return current.endsWith('()') ? initial : current;
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
        if (!this.range) return false;
        const parmas = this.action.refactor(this.provider.document.getText(this.range)).parameters;
        const formal = this.provider.element?.formalPrameters.all ?? [];
        //return parmas.length === formal?.length && formal?.every((p) => parmas?.some((e) => p.maybeGenerated(e)));
        return false;
    }

    get range(): vscode.Range | undefined {
        // This range can be with super constructor.
        const fullRange = this.provider.reader.whereCodeFirstLine((line) => {
            return line.text.search(this.key.pattern()) !== -1
                && !line.text.includesOne('toString()', '=>', 'return', 'factory');
        }, this.provider.range);

        if (!fullRange) return;

        // The range ends with a super constructor position.
        const range = this.provider.reader.rangeWhere(
            fullRange.start,
            (line) => line.text.includesOne(';', ':'),
        );

        if (!range) return;

        const lastLine = this.provider.document.lineAt(range.end.line);
        const character = lastLine.text.search(/\s*;|\s*:|\)\s*;|\)\s*:/);
        // Separated by super constructor.
        return range.with({ end: lastLine.range.end.with({ character: character + 1 }) });
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate Contructor',
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

class SuperConstructorCodeAction implements CodeActionValue {
    constructor(private provider: DartCodeProvider, private action: SuperConstructorGenerator, public position: vscode.Position) { }

    get key(): string {
        return this.action.key;
    }

    get value(): string {
        return this.action.value;
    }

    get insertion(): string {
        return this.value;
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
        const line = this.provider.reader.lineAt(this.position);
        if (!line.text.includesAll(':', 'super(')) return;
        return this.provider.reader.findCodeRange(line.lineNumber, this.provider.range);
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate Super Contructor',
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