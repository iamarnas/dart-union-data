
import * as vscode from 'vscode';
import { DartCodeProvider } from '..';
import { MapMethodGenerator } from '../../../generators/map-mehtod.generator';
import { CodeActionValue } from '../../../interface';
import { ClassDataTemplate } from '../../../templates';
import '../../../types/array';
import { stringLine } from '../../../utils';

export class FromMapCodeAction implements CodeActionValue {
    private generator: MapMethodGenerator;
    value: string;

    constructor(private provider: DartCodeProvider, element: ClassDataTemplate) {
        this.generator = new MapMethodGenerator(element);
        this.value = this.generator.writeFromMap().generate();
    }

    get key(): string {
        throw new Error('Method not implemented.');
    }

    private get lines() {
        return this.provider.reader.rangeToLines(this.range);
    }

    get items(): FromMapItemCodeAction[] {
        const codeRange = this.range;
        if (!codeRange) return [];
        return this.generator.fromMapItems.map((value) => new FromMapItemCodeAction(value, codeRange, this.provider));
    }

    get generatedItemsRanges(): vscode.Range[] {
        const ranges: vscode.Range[] = [];
        let buffer: vscode.TextLine[] = [];

        for (let i = 0; i < this.lines.length; i++) {
            const line = this.lines[i];

            if (line.text.match(/^\s*.*:\s*.*\[/) !== null) {
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

    get removals(): vscode.Range[] {
        return this.generatedItemsRanges.filter((e) => !this.items.some((i) => i.range?.contains(e)));
    }

    get insertions(): FromMapItemCodeAction[] {
        return this.items.filter((e) => !e.isGenerated);
    }

    get replacements(): FromMapItemCodeAction[] {
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
            (line) => line.text.includesAll('fromMap(', 'Map<String, dynamic>'),
            this.provider.range,
        );
    }

    fix(): vscode.CodeAction {
        return this.provider.insertFix(
            this.position,
            'Generate fromMap Map',
            this.insertion,
        );
    }

    async update(): Promise<void> {
        await this.provider.replace(this);
    }

    async delete(): Promise<void> {
        throw new Error('Method not implemented.');
    }
}

class FromMapItemCodeAction implements CodeActionValue {
    private mapNameMatch = /:\s*(.*)\[/;
    readonly value: string;

    constructor(
        value: string,
        private codeRange: vscode.Range,
        private provider: DartCodeProvider,
    ) {
        this.value = this.mapName === 'map'
            ? value
            : value.replace(this.mapNameMatch, `: ${this.mapName}[`);
    }

    private get lines(): vscode.TextLine[] {
        return this.provider.reader.rangeToLines(this.codeRange);
    }

    private get startLine(): vscode.TextLine | undefined {
        return this.lines.find((e) => e.text.trimStart().startsWith(this.key + ':'));
    }

    private get mapName(): string {
        const regx = /Map<String, dynamic>\s*(\w+)/;
        return regx.exec(this.provider.reader.lineAt(this.codeRange.start.line).text)?.at(1) ?? 'map';
    }

    private get containsMapName(): boolean {
        return this.startLine?.text.indexOf(this.mapName + '[') !== 1;
    }

    get isBlockBody(): boolean {
        return this.codeRange.end.line !== this.position.line + 1;
    }

    get key(): string {
        const value = this.value.trimStart();
        return value.slice(0, value.indexOf(':'));
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
        return code.indexOf(item) !== -1 && this.containsMapName;
    }

    get range(): vscode.Range | undefined {
        const line = this.startLine;
        if (!line) return;

        if (line.text.includes('(')) {
            return this.provider.reader.findCodeRange(line.text);
        }

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
