import * as vscode from 'vscode';
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

    lineAt(line: number): vscode.TextLine {
        return this.doc.lineAt(line);
    }

    /**
     * Get text lines from the range.
     * @param range a valid range from the curret text document.
     * @return a list with text lines. If the range is undefined or not valid returns an empty list.
     */
    textLinesFromRange(range: vscode.Range | undefined): vscode.TextLine[] {
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
     * Get the range from the text lines.
     * @param lines a text lines to calculate range.
     * @returns a range from 0 to the last character number.
     */
    rangeFromTextLines(...lines: vscode.TextLine[]): vscode.Range | undefined {
        if (lines.length === 0) return;
        return new vscode.Range(
            new vscode.Position(lines[0].lineNumber, 0),
            new vscode.Position(
                lines[lines.length - 1].lineNumber,
                lines[lines.length - 1].range.end.character,
            ),
        );
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
        const startOfCommnet = regexp.combine(regexp.startOfComment, /^\s*\*/);

        for (const line of lines ?? this.lines) {
            if (startOfCommnet.test(line.text)) continue;

            if (characters.every((e) => line.text.indexOf(e) !== -1)) {
                buffer.push(line);
            }
        }

        return buffer;
    }

    /**
     * The function to find codes ranges.
     * @param codes a list with codes.
     * @returns the list of the code range.
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
    mergeRanges(...ranges: vscode.Range[]): vscode.Range | undefined {
        if (ranges.length === 0) return;
        return new vscode.Range(ranges[0].start, ranges[ranges.length - 1].end).with();
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

        const isWithinCurlyBrackets = start.text.trimEnd().endsWith('{');
        const hasParentheses = start.text.indexOf('(') !== - 1;
        const openBraket = isWithinCurlyBrackets ? '{' : '(';
        const closeBraket = isWithinCurlyBrackets ? '}' : ')';
        const error = `Could not find code from the given first line: ${split[0]}. Check if your code is valid and includes '{}' or '()' brackets.`;
        let lastLineNumber = 0, a = 0, b = 0;

        if (!isWithinCurlyBrackets && !hasParentheses) {
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

        return this.rangeFromTextLines(start, this.lineAt(lastLineNumber));
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
     * A function that reads code to the top from the current position
     * and if a predicate was found reads code to the end.
     * @param position current position.
     * @returns range of the code. If code was not detected undefined returns.
     */
    detectCodeRange(position: vscode.Position, predicate: RegExp | string): vscode.Range | undefined {
        for (let i = position.line; i > -1; i--) {
            const line = this.lines[i];

            if (typeof predicate === 'string' && predicate.match(line.text) !== null) {
                return this.findCodeRange(line.text);
            }

            if (predicate instanceof RegExp && predicate.test(line.text)) {
                return this.findCodeRange(line.text);
            }
        }
    }
}