import * as vscode from 'vscode';
import '../types/array';
import '../types/string';
import { regexp } from '../utils';

/**
 * The utility class for reading programing language code syntax from text document.
 */
export abstract class CodeReader {
    /**
     * All text lines of the document.
     */
    readonly lines: vscode.TextLine[] = [];

    constructor(protected doc: vscode.TextDocument) {
        for (let i = 0; i < this.doc.lineCount; i++) {
            const line = this.doc.lineAt(i);
            this.lines.push(line);
        }
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

    lineAt(line: number | vscode.Position): vscode.TextLine {
        return this.doc.lineAt(typeof line === 'number' ? line : line.line);
    }

    /**
     * Get text lines from the range.
     * @param range a valid range from the curret text document.
     * @return a list with text lines. If the range is undefined or not valid returns an empty list.
     */
    rangeToLines(range: vscode.Range | undefined): vscode.TextLine[] {
        const result: vscode.TextLine[] = [];
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
    getText(range?: vscode.Range | undefined): string {
        return this.doc.getText(range);
    }

    /**
     * Get the text from current code.
     * @param range include only the text included by the range.
     * @returns the text inside the provided range or the entire text.
     */
    abstract getTextFromCode(range?: vscode.Range | undefined): string;

    /**
     * The convenient function to get range union from the text lines
     * @param lines a text lines to calculate range.
     * @returns a range from 0 to the last character number.
     */
    linesToRange(...lines: vscode.TextLine[]): vscode.Range | undefined {
        if (lines.length === 0) return;

        return this.rangeUnion(...lines.map((e) => e.range));
    }

    /**
     * Filter text lines by providing matches. All commented lines in the code will be ignored.
     * @param characters the symbols for searching in the text line.
     * @param lines text lines to search for range. 
     * If lines are undefined will be searched in the document content.
     * @returns a text lines where characters matches. Otherwise empty list.
     */
    whereTextLine(characters: string[], lines?: vscode.TextLine[]): vscode.TextLine[] {
        const buffer: vscode.TextLine[] = [];
        const textLines = lines ?? this.lines;
        const startOfCommnet = regexp.combine(regexp.startOfComment, /^\s*\*/);
        const isValid = (text: string) => characters.every((e) => text.indexOf(e) !== -1);
        const isCommet = (text: string) => startOfCommnet.test(text);

        for (const line of textLines) {
            if (isCommet(line.text)) continue;

            if (!isCommet(line.text) && isValid(line.text)) {
                buffer.push(line);
            }
        }

        return buffer;
    }

    /**
     * The function to find codes ranges.
     * @param codes a list with codes.
     * @returns the list of the code ranges.
     */
    whereCodeBlock(codes: string[], lines?: vscode.TextLine[]): vscode.Range[] {
        const buffer: vscode.Range[] = [];

        for (const code of codes) {
            const codeRange = this.findCodeRange(code, lines);

            if (codeRange) {
                buffer.push(codeRange);
            }
        }

        return buffer;
    }

    /**
     * Convenience function to merge ranges into one.
     * @param ranges a list of ranges.
     * @returns a range by starting from the first element position and ending from the last element position.
     */
    rangeUnion(...ranges: vscode.Range[]): vscode.Range | undefined {
        if (ranges.length === 0) return;
        return ranges[0].union(ranges[ranges.length - 1]);
    }

    /**
     * Reads code intervals between closing parentheses.
     * The text of the first line must contain method brackets `(` or `{`.
     * @param text the valid code syntax or function name. Can be first line of the code.
     * @param lines text lines to search for range. 
     * If lines are undefined will be searched in the document content.
     * @returns the code block range.
     */
    findCodeRange(text: string, lines?: vscode.TextLine[]): vscode.Range | undefined {
        const split = text.trimStart().split('\n');
        const start = this.whereTextLine([split[0]], lines)[0];

        if (!start) return;

        const hasCurly = start.text.indexOf('{') !== -1;
        const hasParentheses = start.text.indexOf('(') !== -1;
        const openBraket = hasCurly ? '{' : '(';
        const closeBraket = hasCurly ? '}' : ')';
        const error = `Could not find code from the given first line: ${split[0]}. Check if your code is valid and includes '{}' or '()' brackets.`;
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
     * @param predicate to predict the first line of code.
     * @param lines a text lines to search for the code. 
     * If the line is not specified, it will search for lines in the current document.
     * @returns a range of the code.
     */
    whereCodeFirstLine(predicate: (line: vscode.TextLine) => boolean, lines?: vscode.TextLine[]): vscode.Range | undefined {
        const textLines = lines ?? this.lines;
        const line = textLines.find(predicate);

        if (!line) return;

        return this.findCodeRange(line.text, textLines);
    }

    /**
     * A function that gets the range with the prediction.
     * @param start the start position of the range or text matching elements
     * @param end the position prediction of the range.
     * @returns a selected range or undefined if end prediction does not occur.
     */
    rangeWhere(
        start: vscode.Position | string[],
        end: (textLine: vscode.TextLine) => boolean,
    ): vscode.Range | undefined {

        if (Array.isArray(start)) {
            const startline = this.whereTextLine(start).at(0);

            if (!startline) return;

            for (let i = startline.lineNumber; i < this.doc.lineCount; i++) {
                const line = this.lineAt(i);
                if (end(line)) return startline.range.with({ end: line.range.end });
            }
        } else {
            for (let i = start.line; i < this.doc.lineCount; i++) {
                const line = this.lineAt(i);
                if (end(line)) return line.range.with(start);
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
    rangeWithRemarks(range: vscode.Range): vscode.Range {
        for (let i = range.start.line; i > 0; i--) {
            const line = this.lineAt(i);
            const containAnyCharacter = !line.isEmptyOrWhitespace && !range.contains(line.range);
            const isCodeDependentLine = line.text.trimStart().startsWith('@')
                || regexp.comment.test(line.text)
                || line.isEmptyOrWhitespace;

            if (isCodeDependentLine) continue;

            if (containAnyCharacter) {
                // The second line from the top.
                const secondLine = this.lineAt(line.lineNumber - 1);

                if (secondLine.isEmptyOrWhitespace) {
                    // Keep the space between the instances.
                    return range.with({ start: this.lineAt(secondLine.lineNumber - 1).range.end });
                }

                return range.with({ start: line.range.end });
            }
        }

        return range;
    }

    /**
     * A function that reads code to the top from the current position
     * and if a predicate was found reads code to the end.
     * @param position current position.
     * @param predicate is a match to detect the first line of the code.
     * Code first line must contain closure brackets `{` or `(`.
     * @returns range of the code. If code was not detected undefined returns.
     */
    detectCodeRange(position: vscode.Position, predicate: RegExp | string): vscode.Range | undefined {
        for (let i = position.line; i > -1; i--) {
            const line = this.lines[i];

            if (line.text.startsWith('}')) return;

            if (typeof predicate === 'string' && line.text.indexOf(predicate) !== -1) {
                return this.findCodeRange(line.text);
            }

            if (predicate instanceof RegExp && predicate.test(line.text)) {
                return this.findCodeRange(line.text);
            }
        }
    }
}