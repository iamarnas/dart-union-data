import * as vscode from 'vscode';
import { DartClassDataProvider, DartEnumDataProvider } from '.';
import { CodeActionValueDelete, CodeActionValueInsert, CodeActionValueReplace, ElementBuilder, ElementKind } from '../../interface';
import { ClassDataTemplate } from '../../templates';
import { regexp } from '../../utils';
import { CodeReader } from '../../utils/code-reader';
import { DartLibraries } from './dart-libraries';

/**
 * A data class that provides the Dart class range from the text document
 * and helps read Dart data in the document.
 */
export class DartCodeProvider {
    readonly libraries: DartLibraries;

    /**
     * The utility class helps read code from the text document.
     */
    readonly reader: CodeReader;

    /**
     * The current selected text line.
     */
    readonly selection: vscode.TextLine;

    /**
     * The end position of the code or end position of the document if the code is not found.
     */
    readonly end: vscode.TextLine;

    constructor(public document: vscode.TextDocument, selection: vscode.Range) {
        this.reader = new CodeReader(document);
        this.libraries = new DartLibraries(this.reader);
        this.selection = document.lineAt(selection.start.line);
        this.end = !this.range ? document.lineAt(document.lineCount - 1) : document.lineAt(this.range.end);
    }

    get element(): ClassDataTemplate | undefined {
        // Due to safety do not allow create an element if selection not match the class range.
        if (!this.isSelected) return;

        try {
            return ElementBuilder.fromString(this.text).build();
        } catch (error) {
            console.error(error);
        }
    }

    get data(): DartClassDataProvider | undefined {
        if (this.element !== undefined && this.element.kind === ElementKind.class) {
            try {
                return new DartClassDataProvider(this, this.element);
            } catch (error) {
                console.error(error);
            }
        }
    }

    get enumData(): DartEnumDataProvider | undefined {
        if (this.element !== undefined && this.element.kind === ElementKind.enum) {
            try {
                return new DartEnumDataProvider(this, this.element);
            } catch (error) {
                console.error(error);
            }
        }
    }

    /**
     * Indicates whether the selection is contained in this class range.
     * @return `true` if the {@link selection} is inside or equal to this class range.
     */
    get isSelected(): boolean {
        return this.range?.contains(this.selection.range) || false;
    }

    /**
     * The end of the line position.
     */
    get eol(): vscode.Position {
        return this.document.lineAt(this.document.lineCount - 1).range.end;
    }

    /**
     * The position of the first line of code.
     * @returns first line position.
     */
    get start() {
        return this.document.lineAt(this.range?.start ?? this.selection.range.end);
    }

    /** 
     * The selected code (Class) range where the current {@link selection} is,
     * and this range mutates depending on the selection. 
     */
    get range(): vscode.Range | undefined {
        return this.reader.detectCodeRange(this.selection.range.start, {
            startWhen: (line) => regexp.classMatch.test(line.text),
            breakWhen: (line) => line.firstNonWhitespaceCharacterIndex === 0
                && !regexp.classMatch.test(line.text)
                && !line.isEmptyOrWhitespace,
        });
    }

    /**
     * The method is similar to `document.getText()`,
     * but only searches in the text area of the selected code,
     * the rest of the content will be ignored.
     * @param range include only the text included in the range.
     * @returns the text inside the provided range or the entire text.
     */
    getText(range?: vscode.Range | undefined): string {
        const lines = this.reader.rangeToLines(this.range).filter((l) => range && range.contains(l.range));
        return this.document.getText(this.reader.linesToRange(...lines));
    }

    /**
     * The text lines of the current code from {@link range}.
     */
    get lines(): vscode.TextLine[] {
        return this.reader.rangeToLines(this.range);
    }

    /**
     * The text of the selected class.
     */
    get text(): string {
        return this.document.getText(this.range);
    }

    get editor(): vscode.TextEditor | undefined {
        return vscode.window.activeTextEditor;
    }

    /**
     * Check if a position or a range is contained in this code range.
     */
    contains(range: vscode.Range | vscode.Position | undefined): boolean {
        if (!range || !this.range) return false;
        return this.range.contains(range);
    }

    /**
     * Checks if text or code is in the selected code.
     */
    hasText(text: string) {
        return text.trim()
            .split('\n')
            .map((line) => line.replace(/,$/, '').trim())
            .every((e) => this.text.indexOf(e) !== -1);
    }

    /**
     * The position of the end of the selected code within the code.
     * The expected position is before the last character `}`.
     * @returns end position inside the code.
     */
    withinCode() {
        const character = this.end.text.match('}')?.index;
        return this.end.range.end.with({ character: character ?? 0 });
    }

    /**
     * The position before enclosed bracket `)` or `}`.
     * @param searchIn An range of the `Map` method.
     * @returns An position inside the method.
     */
    withinMap(searchIn: vscode.Range): vscode.Position {
        const mapCallback = this.reader.whereCodeFirstLine((line) => line.text.includesOne('=>', 'return '), searchIn);

        if (!mapCallback) {
            console.error(`Error to get return value from the code: ${this.reader.getText(searchIn)}`);
        }

        const body = searchIn.with(mapCallback?.start, mapCallback?.end);
        const lastLine = this.document.lineAt(body.end.line);
        const character = lastLine.text.match(';')?.index;
        const position = lastLine.range.end.with({ character: character });
        return lastLine.text.indexOf('(') === -1
            ? this.document.lineAt(body.end.line - 1).range.end
            : position;
    }

    /**
     * The position before enclosed bracket `)` or `}` and `]`.
     * @param searchIn An range of the constructor body.
     * @returns An position inside the constructor.
     */
    withinConstructor(searchIn: vscode.Range): vscode.Position {
        const endMatch = /(?<=[\]},\w\d'"])(\s*]\)|\s*}\)|\s*\))\s*(;|:|\s*$)/;

        const range = this.reader.rangeWhere(
            searchIn.start.line,
            (line) => line.text.search(/;|:/) !== -1 || line.text.trimEnd().endsWith(')'),
        );

        if (!range) {
            console.error(`Error: Could not find the end of the constructor in the given text, text: ${this.document.getText(searchIn)}`);
            return searchIn.end;
        }

        const lineBefore = this.document.lineAt(range.end.line);

        if (lineBefore.text.trimEnd().endsWith(',')) {
            return lineBefore.range.end;
        }

        const character = this.document.lineAt(range.end.line).text.indexesOf(endMatch).at(0)?.at(0);

        if (character !== undefined) {
            return range.end.with({ character: character });
        }

        return range.end;
    }

    insertFix(
        position: vscode.Position,
        title: string,
        text: string,
    ): vscode.CodeAction {
        const fix = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();
        fix.isPreferred = true;
        fix.edit.insert(this.document.uri, position, text);
        return fix;
    }

    replaceFix(
        range: vscode.Range,
        title: string,
        text: string,
    ): vscode.CodeAction {
        const fix = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();
        fix.isPreferred = true;
        fix.edit.replace(this.document.uri, range, text);
        return fix;
    }

    deleteFix(
        range: vscode.Range,
        title: string,
    ): vscode.CodeAction {
        const fix = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();
        fix.isPreferred = true;
        fix.edit.delete(this.document.uri, range);
        return fix;
    }

    createCommand(command: vscode.Command, diagnostics?: vscode.Diagnostic[]): vscode.CodeAction {
        const action = new vscode.CodeAction(command.title, vscode.CodeActionKind.QuickFix);
        action.command = command;
        action.isPreferred = true;
        action.diagnostics = diagnostics;
        return action;
    }

    async replace(...values: CodeActionValueReplace[]) {
        if (!this.editor) return;
        await this.editor.edit((editBuilder) => {
            for (const element of values) {
                if (element.range !== undefined) {
                    editBuilder.replace(element.range, element.value);
                }
            }
        });
    }

    async insert(...values: CodeActionValueInsert[]) {
        if (!this.editor) return;
        await this.editor.edit((editBuilder) => {
            for (const element of values) {
                editBuilder.insert(element.position, element.insertion);
            }
        });
    }

    async delete(...values: CodeActionValueDelete[]) {
        if (!this.editor) return;
        await this.editor.edit((editBuilder) => {
            for (const element of values) {
                if (element.range !== undefined) {
                    editBuilder.delete(element.range);
                }
            }
        });
    }
}
