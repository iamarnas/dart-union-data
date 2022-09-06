import * as vscode from 'vscode';
import { DartCodeProvider } from '..';
import { MapMethodGenerator } from '../../../generators';
import { CodeActionValue } from '../../../interface';
import { ClassDataTemplate } from '../../../templates';
import { stringLine } from '../../../utils';

export class ToMapCodeAction implements CodeActionValue {
    private generator: MapMethodGenerator;
    value: string;

    constructor(private provider: DartCodeProvider, element: ClassDataTemplate) {
        this.generator = new MapMethodGenerator(element);
        this.value = this.generator.writeToMap().generate();
    }

    get key(): string {
        throw new Error('Method not implemented.');
    }

    private get lines() {
        return this.provider.reader.rangeToLines(this.range);
    }

    get items(): ToMapItemCodeAction[] {
        const codeRange = this.range;
        if (!codeRange) return [];
        return this.generator.toMapItems.map((value) => new ToMapItemCodeAction(value, codeRange, this.provider));
    }

    get generatedItemsRanges(): vscode.Range[] {
        const ranges: vscode.Range[] = [];
        let buffer: vscode.TextLine[] = [];

        for (let i = 0; i < this.lines.length; i++) {
            const line = this.lines[i];

            if (line.text.match(/^\s*'(.*)'\s*:/) !== null) {
                buffer.push(line);
            }

            if (line.text.trimEnd().endsWith(',')) {
                if (!buffer.includes(line)) {
                    buffer.push(line);
                }
            }

            const range = this.provider.reader.linesToRange(...buffer);

            if (range) {
                ranges.push(range);
            }

            buffer = [];
        }

        return ranges;
    }

    get removals() {
        return this.generatedItemsRanges.filter((e) => !this.items.some((i) => i.range?.contains(e)));
    }

    get insertions(): ToMapItemCodeAction[] {
        return this.items.filter((e) => !e.isGenerated);
    }

    get replacements(): ToMapItemCodeAction[] {
        return this.items.filter((e) => e.isGenerated && !e.isUpdated);
    }

    get insertion(): string {
        return '\n' + this.value + '\n';
    }

    get position(): vscode.Position {
        return this.provider.withinCode();
    }

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get isUpdated(): boolean {
        return this.replacements.length === 0 && this.insertions.length === 0;
    }

    get range(): vscode.Range | undefined {
        return this.provider.reader.whereCodeFirstLine(
            (line) => line.text.includesAll('Map<String, dynamic>', 'toMap()'),
            this.provider.range,
        );
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate toMap Map',
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

class ToMapItemCodeAction implements CodeActionValue {
    private mapKeyMatch = /^\s*'(.*)'\s*:/;

    constructor(
        readonly value: string,
        private codeRange: vscode.Range,
        private provider: DartCodeProvider,
    ) { }

    private get lines(): vscode.TextLine[] {
        return this.provider.reader.rangeToLines(this.codeRange);
    }

    private get startLine(): vscode.TextLine | undefined {
        return this.lines.find((e) => this.mapKeyMatch.test(e.text) && e.text.includes(`'${this.key}'`));
    }

    get key(): string {
        const value = this.value.trimStart();
        const name = this.mapKeyMatch.exec(value)?.at(1);

        if (!name) {
            console.error(`ToMapItemCodeAction.name: failed to read the map key from the value: ${this.value}`);
            return 'undefined';
        }

        return name;
    }

    get isBlockBody(): boolean {
        return this.codeRange.end.line !== this.position.line + 1;
    }

    get insertion(): string {
        if (!this.isBlockBody) return '\n' + this.value;
        return '\n\t\t\t' + this.value.trimStart();
    }

    get position(): vscode.Position {
        const start = this.startLine;
        const defaultPosition = this.provider.withinMap(this.codeRange);

        if (!start) return defaultPosition;

        return new vscode.Position(start.lineNumber, start.firstNonWhitespaceCharacterIndex);
    }

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    get isUpdated(): boolean {
        const code = stringLine(this.provider.getText(this.codeRange));
        const item = stringLine(this.value);
        return code.indexOf(item) !== -1;
    }

    get range(): vscode.Range | undefined {
        const line = this.startLine;
        if (!line) return;

        return this.provider.reader.rangeWhere(
            line.range.start,
            (line) => line.text.trimEnd().endsWith(','),
        );
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate Map Item',
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