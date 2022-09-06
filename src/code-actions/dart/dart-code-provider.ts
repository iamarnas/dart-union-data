import * as vscode from 'vscode';
import { DartClassDataProvider, DartEnumDataProvider } from '.';
import { ElementBuilder, ElementKind } from '../../interface';
import { CodeActionValueDelete, CodeActionValueInsert, CodeActionValueReplace } from '../../interface/action';
import { ClassDataTemplate } from '../../templates';
import { regexp } from '../../utils';
import { CodeReader } from '../code-reader';

/**
 * A data class that provides the Dart class range from the text document
 * and helps read Dart data in the document.
 */
export class DartCodeProvider {

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
    readonly end: vscode.Position;

    constructor(public document: vscode.TextDocument, selection: vscode.Range) {
        this.reader = new CodeReader(document);
        this.selection = document.lineAt(selection.start.line);
        this.end = this.range?.end ?? document.lineAt(document.lineCount - 1).range.end;
    }

    get element(): ClassDataTemplate | undefined {
        try {
            return ElementBuilder.fromString(this.text).build();
        } catch (error) {
            console.error(error);
        }
    }

    get data(): DartClassDataProvider | undefined {
        if (this.element && this.element.kind === ElementKind.class) {
            try {
                return new DartClassDataProvider(this, this.element);
            } catch (error) {
                console.error(error);
            }
        }
    }

    get enum(): DartEnumDataProvider | undefined {
        if (this.element && this.element.kind === ElementKind.enum) {
            try {
                return new DartEnumDataProvider(this, this.element);
            } catch (error) {
                console.error(error);
            }
        }
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
        return this.end.with({ character: this.end.character - 1 });
    }

    /**
     * The position before enclosed bracket `)` or `}`.
     * @param within An range of the `Map` method.
     * @returns An range inside the method.
     */
    withinMap(within: vscode.Range): vscode.Position {
        const callback = this.reader.whereCodeFirstLine((line) => line.text.includesOne('=>', 'return '), within);
        const body = within.with(callback?.start, callback?.end);
        const lastLine = this.document.lineAt(body.end.line);
        const character = lastLine.text.indexOf(';') - 1;
        const position = lastLine.range.start.with({ character: character });
        return position;
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
