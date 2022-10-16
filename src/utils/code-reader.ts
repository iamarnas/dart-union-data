import { Position, Range, TextDocument, TextLine } from 'vscode';
import { regexp } from '.';
import '../types/array';
import '../types/map';
import '../types/string';

/**
 * The utility class for reading programing language code syntax from text document.
 */
export class CodeReader {
    /**
     * All text lines of the document.
     */
    readonly lines: TextLine[] = [];

    readonly classes: Map<TextLine, Range> = new Map();

    constructor(private doc: TextDocument) {
        for (let i = 0; i < this.doc.lineCount; i++) {
            const line = this.doc.lineAt(i);
            this.lines.push(line);

            if (regexp.classMatch.test(line.text)) {
                const range = this.findCodeRange(line.lineNumber);
                if (!range) continue;
                this.classes.set(line, range);
            }
        }
    }

    containsClass(selection: TextLine | Range): boolean {
        const start = selection instanceof Range ? selection.start : selection.range.start;
        return [...this.classes.values()].some((e) => e.contains(start));
    }

    /**
     * Checks if text or code is in the document.
     */
    hasText(text: string): boolean {
        return text.trim()
            .split('\n')
            .map((line) => line.replace(/,$/, '').trim())
            .every((e) => this.doc.getText().indexOf(e) !== -1);
    }

    lineAt(line: number | Position): TextLine {
        if (typeof line === 'number') return this.doc.lineAt(line);
        return this.doc.lineAt(line.line);
    }

    /**
     * Get text lines from the range.
     * @param range a valid range from the curret text document.
     * @return a list with text lines. If the range is undefined or not valid returns an empty list.
     */
    rangeToLines(range: Range | undefined): TextLine[] {
        const result: TextLine[] = [];
        if (!range || !this.doc.validateRange(range)) return result;

        for (let i = range.start.line; i < range.end.line + 1; i++) {
            result.push(this.lineAt(i));
        }

        return result;
    }

    /**
     * Get the text of this document.
     * @param range include only the text included by the range.
     * @returns the text inside the provided range or the entire text.
     */
    getText(range?: Range | undefined): string {
        return this.doc.getText(range);
    }

    /**
     * The convenient function to get range union from the text lines
     * @param lines a text lines to calculate range.
     * @returns a range from 0 to the last character number.
     */
    linesToRange(...lines: TextLine[]): Range | undefined {
        if (lines.length === 0) return;

        return this.rangeUnion(...lines.map((e) => e.range));
    }

    /**
     * Filter text lines by providing matches. All commented lines in the code will be ignored.
     * @param match the text or the symbols for searching in the text line or `RegExp` match.
     * If match is a `number`, returns the line at this `number` equal to `document.lineAt(number)`.
     * @param searchIn a range or text lines to search for characters. 
     * If lines are undefined will be searched in the document content.
     * @returns a text lines where match matches. Otherwise empty list.
     */
    whereTextLine(match: string[] | number | RegExp, searchIn?: Range | TextLine[]): TextLine[] {
        const buffer: TextLine[] = [];
        let textLines = this.lines;

        if (typeof match === 'number') {
            return [this.lineAt(match)];
        }

        if (Array.isArray(searchIn)) {
            if (searchIn.isEmpty()) {
                console.error(`Error. It is not possible to search for a '${match}' in the given empty array. Check if the given value is not empty.`);
            } else {
                textLines = searchIn;
            }
        }

        if (searchIn instanceof Range) {
            textLines = this.rangeToLines(searchIn);
        }

        const [startLine] = textLines;
        const lastLine = textLines[textLines.length - 1];
        const startOfCommnet = regexp.combine(regexp.startOfComment, /^\s*\*/);
        const isValid = (text: string) => {
            if (Array.isArray(match)) {
                return match.every((e) => text.indexOf(e) !== -1);
            }

            if (match instanceof RegExp) {
                return match.test(text);
            }

            // Otherwise, true is returned if match is line number.
            return true;
        };

        const isCommet = (text: string) => startOfCommnet.test(text);

        for (let i = startLine.lineNumber; i < this.lines.length; i++) {
            const line = this.lines[i];

            if (isCommet(line.text)) continue;

            if (!isCommet(line.text) && isValid(line.text)) {
                buffer.push(line);
            }

            if (lastLine.lineNumber === i) break;
        }

        return buffer;
    }

    /**
     * The function to find codes ranges.
     * @param codes a list with codes.
     * @returns the list of the code ranges.
     */
    whereCodeBlock(codes: string[], searchIn?: Range): Range[] {
        const buffer: Range[] = [];

        for (const code of codes) {
            const range = this.findCodeRange(code, searchIn);
            if (!range) continue;
            buffer.push(range);
        }

        return buffer;
    }

    /**
     * Convenience function to merge ranges into one.
     * @param ranges a list of ranges.
     * @returns a range by starting from the first element position and ending from the last element position.
     */
    rangeUnion(...ranges: Range[]): Range | undefined {
        if (ranges.length === 0) return;
        return ranges[0].union(ranges[ranges.length - 1]);
    }

    /**
     * Reads code intervals between closing parentheses.
     * The text of the first line must contain method brackets `(` or `{`.
     * @param from the valid code syntax or function name. Can be first line of the code.
     * Or line number.
     * @param searchIn a range to search for text. 
     * If within are undefined will be searched in the document content.
     * @returns the code block range.
     */
    findCodeRange(from: string | number, searchIn?: Range): Range | undefined {
        const match = typeof from === 'string' ? from.trimStart().split('\n') : from;
        const [start] = this.whereTextLine(match, searchIn);

        if (!start) return;

        const hasCurly = start.text.indexOf('{') !== -1;
        const hasParentheses = start.text.indexOf('(') !== -1;
        const openBraket = hasCurly ? '{' : '(';
        const closeBraket = hasCurly ? '}' : ')';
        const error = `Could not find code from the given first line: ${start.text}. Check if your code is valid and includes '{}' or '()' brackets.`;
        let lastLineNumber = 0, a = 0, b = 0;

        if (!hasCurly && !hasParentheses) {
            console.error(error);
            return;
        }

        for (let i = start.lineNumber; i < this.lines.length; i++) {
            const line = this.lines[i];
            if (regexp.comment.test(line.text)) continue;
            a = a + line.text.lengthOf(openBraket);
            b = b + line.text.lengthOf(closeBraket);
            lastLineNumber = line.lineNumber;

            if (a === b) break;
        }

        return this.linesToRange(start, this.lineAt(lastLineNumber));
    }

    /**
     * The function read lines down from the predicate to the end of the code.
     * @param predicate to predict the first line of code or line number.
     * @param searchIn a range where to search for the code. 
     * If the range is not specified, it will search for line in the current document.
     * @returns a range of the code.
     */
    whereCodeFirstLine(predicate: (line: TextLine) => boolean | number, searchIn?: Range): Range | undefined {
        const lines = searchIn ? this.rangeToLines(searchIn) : this.lines;
        const range = this.linesToRange(...lines);

        for (const line of lines) {
            if (predicate(line)) {
                return this.findCodeRange(line.lineNumber, range);
            }
        }
    }

    /**
     * A function that gets the range from the start prediction to the end prediction.
     * @param from a start position can be specified with `Position`, line `number` 
     * or `string[]` elements that match code text in the first line.
     * @param end the position prediction of the range.
     * @returns a selected range or undefined if end prediction does not occur.
     */
    rangeWhere(from: Position, end: (line: TextLine) => boolean): Range | undefined;
    rangeWhere(from: string[], end: (line: TextLine) => boolean): Range | undefined;
    rangeWhere(from: number, end: (line: TextLine) => boolean): Range | undefined;
    rangeWhere(from: unknown, end: (line: TextLine) => boolean): Range | undefined {
        if (Array.isArray(from)) {
            const startline = this.whereTextLine(from).at(0);

            if (!startline) return;

            for (let i = startline.lineNumber; i < this.doc.lineCount; i++) {
                const line = this.lineAt(i);
                if (end(line)) return startline.range.with({ end: line.range.end });
            }
        }

        if (from instanceof Position) {
            for (let i = from.line; i < this.doc.lineCount; i++) {
                const line = this.lineAt(i);
                if (end(line)) return line.range.with(from);
            }
        }

        if (typeof from === 'number') {
            const firstLine = this.lineAt(from);
            for (let i = firstLine.lineNumber; i < this.doc.lineCount; i++) {
                const line = this.lineAt(i);
                if (end(line)) return line.range.with(firstLine.range.start);
            }
        }
    }

    /**
     * Derived a new range from this range included with remarks like comments,
     * annotations, and empty or blank lines.
     * @param range a range of some code or value.
     * @returns a range with included remarks and empty lines.
     * The range start position are from the last character position of the non-empty or black line.
     */
    rangeWithRemarks(range: Range): Range {
        for (let i = range.start.line; i > 0; i--) {
            const line = this.lineAt(i);
            const containAnyCharacter = !line.isEmptyOrWhitespace && !range.contains(line.range);
            const isCodeDependentLine = line.text.trimStart().startsWith('@')
                || regexp.comment.test(line.text)
                || line.isEmptyOrWhitespace;

            if (isCodeDependentLine) continue;

            if (containAnyCharacter) {
                return range.with({ start: line.range.end });
            }
        }

        return range;
    }

    /**
     * A function that reads code to the top from the current selected position
     * and if `startWhen` is `true` reads code to the end.
     * If `breakWhen` is `true` stops the search.
     * 
     * **Note:** code first line must contain closure brackets `{` or `(` 
     * to be the returned result of search.
     * @param selection current position.
     * @param option a option to set start and break lines and change the search range.
     * @returns range of the code. If code was not detected undefined returns.
     */
    detectCodeRange(
        selection: Position,
        option: {
            startWhen: (line: TextLine) => boolean,
            breakWhen: (line: TextLine) => boolean,
            searchIn?: Range,
        }): Range | undefined {
        for (let i = selection.line; i > -1; i--) {
            const line = this.lines[i];

            if (option.breakWhen(line)) return;

            if (option.startWhen(line)) {
                return this.findCodeRange(line.lineNumber, option.searchIn);
            }
        }
    }

    /**
     * A function that returns a range of the given the word or text.
     * - Note: the word or text must be in one line.
     * @param match search element match.
     * @param searchIn where to look for an range.
     * @returns range of the specified word or text, otherwise `undefined`.
     */
    getWordRange(match: string | RegExp, searchIn?: Range): Range | undefined {
        const lines = !searchIn ? this.lines : this.rangeToLines(searchIn);

        if (!lines.length) return;

        for (const line of lines) {
            const text = typeof match === 'string' ? match : match.exec(line.text)?.shift();
            const character = !text ? -1 : line.text.indexOf(text);

            if (character !== -1 && text !== undefined) {
                return line.range.with(
                    line.range.start.with({ character: character }),
                    line.range.start.with({ character: character + text.length }),
                );
            }
        }
    }

    /**
     * A similar function to {@link getWordRange} but returns an array of all matches.
     * @param search element to search.
     * @param searchIn where to look for an range. If no search range is specified will search in the active editor document content.
     * @returns an array of ranges of the specified predicts, otherwise the empty array.
     */
    getWordRanges(search: string | RegExp, searchIn?: TextLine[] | Range): Range[] {
        const ranges: Range[] = [];
        let { lines } = this;

        if (Array.isArray(searchIn)) {
            lines = searchIn;
        }

        if (searchIn instanceof Range) {
            lines = this.rangeToLines(searchIn);
        }

        for (const line of lines) {
            const indexes = line.text.indexesOf(search);
            ranges.push(...indexes.map(([start, end]) => new Range(line.lineNumber, start, line.lineNumber, end)));
        }

        return ranges;
    }
}