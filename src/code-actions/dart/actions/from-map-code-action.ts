
import * as vscode from 'vscode';
import { DartCodeProvider } from '..';
import { MapMethodGenerator } from '../../../generators/map-mehtod.generator';
import { CodeActionValue } from '../../../interface';
import { FromMapRefactor } from '../../../refactors/from-map-refactor';
import '../../../types/array';

export class FromMapCodeAction implements CodeActionValue {
    constructor(private provider: DartCodeProvider, private action: MapMethodGenerator) { }

    get key(): string {
        return 'fromMap(';
    }

    get value(): string {
        if (this.refactor !== undefined) return this.refactor.value;
        return this.action.generateFromMap();
    }

    get refactor(): FromMapRefactor | undefined {
        if (this.range !== undefined) {
            return this.action.refactor(this.provider.document.getText(this.range), this.provider.element?.instances.all);
        }
    }

    // get items(): CodeActionValue[] {
    //     const { range } = this;
    //     if (!range) return [];
    //     return this.action.fromMapItems.map((value) => new FromMapItemCodeAction(value, range, this.provider));
    // }

    // get generatedItemsRanges(): vscode.Range[] {
    //     const { range } = this;
    //     if (!range) return [];
    //     const lines = this.provider.reader.whereTextLine(/^\s*.*:\s*.*\[/, range);
    //     if (lines.length === 0) return [];
    //     const paired = lines.map(pairObjects);
    //     const end = this.provider.withinMap(range);
    //     return paired.map(([a, b]) => a.range.with({ end: !b ? end : this.provider.reader.lineAt(b.lineNumber - 1).range.end }));
    // }

    // get removals(): vscode.Range[] {
    //     return this.generatedItemsRanges.filter((e) => !this.items.some((i) => i.range?.contains(e)));
    // }

    // get insertions(): CodeActionValue[] {
    //     return this.items.filter((e) => !e.isGenerated);
    // }

    // get replacements(): CodeActionValue[] {
    //     return this.items.filter((e) => e.isGenerated && !e.isUpdated);
    // }

    get insertion(): string {
        return '\n' + this.value + '\n';
    }

    get position(): vscode.Position {
        return this.provider.withinCode();
    }

    get isGenerated(): boolean {
        return this.range !== undefined;
    }

    // FIXME: fix updates
    get isUpdated(): boolean {
        return false;
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
        await this.provider.delete(this);
    }
}

// class FromMapItemCodeAction implements CodeActionValue {
//     constructor(private action: ActionValue, private codeRange: vscode.Range, private provider: DartCodeProvider) { }

//     private get mapName(): string {
//         const regx = /Map<String, dynamic>\s*(\w+)/;
//         const { line } = this.codeRange.start;
//         return regx.exec(this.provider.reader.lineAt(line).text)?.at(1) ?? 'map';
//     }

//     get value(): string {
//         const mapNameMatch = /\w+\[/;
//         if (this.mapName === 'map') return this.action.value;
//         return this.action.value.replace(mapNameMatch, `${this.mapName}[`);
//     }

//     /** @example 'key' */
//     get key(): string {
//         return this.action.key;
//     }

//     get insertion(): string {
//         if (!this.isBlockBody) return '\n' + this.value;
//         return '\n\t\t\t' + this.value.trimStart();
//     }

//     get position(): vscode.Position {
//         const start = this.startLine;
//         const defaultPosition = this.provider.withinMap(this.codeRange);

//         if (!start) return defaultPosition;

//         return start.range.start.with({ character: start.firstNonWhitespaceCharacterIndex });
//     }

//     get isGenerated(): boolean {
//         return this.range !== undefined;
//     }

//     get isUpdated(): boolean {
//         const code = stringLine(this.provider.getText(this.codeRange));
//         const item = stringLine(this.value);
//         return code.indexOf(item) !== -1 && this.containsMapName;
//     }

//     get range(): vscode.Range | undefined {
//         const lines = this.provider.reader.whereTextLine(/^\s*.*:\s*.*\[/, this.lines);
//         if (lines.length === 0) return;
//         const paired = lines.map(pairObjects);
//         const tuple = paired.find((pair) => pair[0].text.indexOf(this.key) !== -1);
//         if (!tuple) return;
//         const end = this.provider.withinMap(this.codeRange);

//         for (const [a, b] of paired) {
//             if (a.range.contains(tuple[0].range)) {
//                 const endLine = this.provider.reader.lineAt(b !== undefined ? b.lineNumber - 1 : end);
//                 const range = a.range.with({ end: endLine.range.end });
//                 return range;
//             }
//         }
//     }

//     private get isBlockBody(): boolean {
//         return !this.provider.reader.lineAt(this.codeRange.start).text.match('=>');
//     }

//     private get lines(): vscode.TextLine[] {
//         return this.provider.reader.rangeToLines(this.codeRange);
//     }

//     private get startLine(): vscode.TextLine | undefined {
//         return this.lines.find((e) => e.text.match(this.key) !== null);
//     }

//     private get containsMapName(): boolean {
//         return this.startLine?.text.indexOf(this.mapName + '[') !== 1;
//     }

//     fix(): vscode.CodeAction {
//         return this.provider.insertFix(
//             this.position,
//             'Generate Map Item',
//             this.insertion,
//         );
//     }

//     async update(): Promise<void> {
//         await this.provider.replace(this);
//     }

//     async delete(): Promise<void> {
//         await this.provider.delete(this);
//     }
// }
