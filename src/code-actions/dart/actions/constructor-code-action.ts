import * as vscode from 'vscode';
import { DartCodeProvider } from '..';
import { GenerativeConstructorGenerator, SuperConstructorGenerator } from '../../../generators';
import { CodeActionValue, CodeActionValueReplace, MultiCodeActionValue } from '../../../interface';
import { ClassDataTemplate, SubclassTemplate } from '../../../templates';
import '../../../types/string';
import { identicalCode, pairObjects } from '../../../utils';

export class ConstructorCodeAction implements MultiCodeActionValue {
    readonly generative: GenerativeConstructorCodeAction;
    readonly super: SuperConstructorCodeAction | undefined;

    constructor(private provider: DartCodeProvider, element: SubclassTemplate | ClassDataTemplate) {
        this.generative = new GenerativeConstructorCodeAction(provider, new GenerativeConstructorGenerator(element));

        if (this.generative.range?.end) {
            this.super = new SuperConstructorCodeAction(provider, new SuperConstructorGenerator(element), this.generative.range?.end);
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
        return !this.super
            ? this.generative.value
            : this.generative.value + this.super.value;
    }

    get insertion(): string {
        return !this.super
            ? this.generative.insertion.trimEnd() + ';'
            : this.generative.insertion + this.super.insertion;
    }

    get position(): vscode.Position {
        return this.generative.position;
    }

    get isGenerated(): boolean {
        return this.super?.isGenerated !== undefined
            ? this.super.isGenerated && this.generative.isGenerated
            : this.generative.isGenerated;
    }

    get isUpdated(): boolean {
        return this.super?.isUpdated !== undefined
            ? this.super.isUpdated && this.generative.isUpdated
            : this.generative.isUpdated;
    }

    get range(): vscode.Range | undefined {
        return this.generative.range?.with({ end: this.super?.range?.end });
    }

    formaters(): CodeActionValueReplace[] {
        const result: CodeActionValueReplace[] = [];
        const { lines, items } = this.generative;
        if (lines.length < 2 || !items.length) return [];
        const [first, second] = lines;
        const tuples = lines.map(pairObjects);

        if (first.text.trimEnd().endsWith('(') || first.text.trimEnd().endsWith(',')
            && !this.provider.document.getText(items[items.length - 1].range).endsWith(',')) {
            tuples.forEach(([a, b]) => {
                if (b !== undefined) {
                    result.push({
                        range: new vscode.Range(a.range.end, b.range.start.with({ character: b.firstNonWhitespaceCharacterIndex })),
                        value: '',
                    });
                }
            });

            items.forEach((item, i) => {
                const { range, position } = item;

                if (range !== undefined) {
                    result.push({
                        range: new vscode.Range(position, position),
                        value: '\n\t\t',
                    });

                    if (i === items.length - 1 && !this.provider.document.getText(item.range).endsWith(',')) {
                        result.push({
                            range: new vscode.Range(range.end, range.end),
                            value: ',\n\t',
                        });
                    }
                }
            });
        }

        return result;
    }

    insertions(): CodeActionValue[] {
        throw new Error('Method not implemented.');
    }

    replacements(): CodeActionValue[] {
        throw new Error('Method not implemented.');
    }

    removals(): vscode.Range[] {
        throw new Error('Method not implemented.');
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
        return this.action.asBlock({ auto: true }).asInitial().value;
    }

    get insertion(): string {
        const insertion = this.action.asBlock({ auto: true }).asInitial().value;
        const space = this.provider.start.isEmptyOrWhitespace ? '' : '\n';
        return '\n' + insertion + space;
    }

    get position(): vscode.Position {
        return this.provider.start.range.end;
    }

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get isUpdated(): boolean {
        // Generated parameters.
        const a = extractConstructorParameters(this.value);
        // Unknown and probably modified parameters or bad formated.
        const b = extractConstructorParameters(this.provider.getText(this.range));
        return a.every((e) => b.includes(e)) && a.length === b.length;
    }

    get range(): vscode.Range | undefined {
        // This range can be with super constructor.
        const fullRange = this.provider.reader.whereCodeFirstLine((line) => {
            return line.text.indexOf(this.key) !== -1
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

    get items(): CodeActionValue[] {
        const { range } = this;
        if (!range) return [];
        const params = extractConstructorParameters(this.provider.document.getText(range));
        return params.map((param) => new ConstructorParameterCodeAction(this.provider, param, range));
    }

    get lines(): vscode.TextLine[] {
        return this.provider.reader.rangeToLines(this.range);
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

class ConstructorParameterCodeAction implements CodeActionValue {
    constructor(private provider: DartCodeProvider, private parameter: string, private constructorRange: vscode.Range) { }

    get key(): string {
        return this.parameter;
    }

    get value(): string {
        return this.parameter;
    }

    get insertion(): string {
        return '\n' + this.value + '\n';
    }

    get position(): vscode.Position {
        if (this.range !== undefined) return this.range.start;
        return this.provider.withinConstructor(this.constructorRange);
    }

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get isUpdated(): boolean {
        const fields = this.provider.element?.fields;
        if (!fields) return false;
        return fields.some((e) => this.key.indexOf(e.element.name) !== -1);
    }

    get range(): vscode.Range | undefined {
        const range = this.provider.reader.getWordRange(this.key, this.constructorRange);
        if (!range) return;
        // Include the comma to the parameter range.
        const character = this.provider.reader.lineAt(range.start).text.indexOf(',', range.start.character);
        return character !== -1
            ? range.with({ end: range.end.with({ character: character + 1 }) })
            : range;
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate Parameter',
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

function extractConstructorParameters(text: string): string[] {
    return text.replace(/\n/g, '')
        .slice(text.indexOf('('), text.lastIndexOf(')'))
        .split(',')
        .map((e) => e.includes('const')
            ? e.slice(0, e.search(/\}|\]/) + 1)
            : e.replace(/\(|\)|\[|\]|\{|\}|;/g, ''))
        .map((e) => e.trim())
        .filter(Boolean);
}