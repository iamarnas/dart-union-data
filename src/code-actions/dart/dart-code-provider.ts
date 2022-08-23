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
export class DartCodeProvider extends CodeReader {
    /**
     * The current selected text line.
     */
    readonly selection: vscode.TextLine;

    /**
     * The end position of the code or end position of the document if the code is not found.
     */
    readonly end: vscode.Position;

    constructor(public document: vscode.TextDocument, selection: vscode.Range) {
        super(document);
        this.selection = document.lineAt(selection.start.line);
        this.end = this.range?.end ?? document.lineAt(document.lineCount - 1).range.end;
    }

    get element(): ClassDataTemplate | undefined {
        return ElementBuilder.fromString(this.text).build();
    }

    get data(): DartClassDataProvider | undefined {
        if (this.element && this.element.kind === ElementKind.class) {
            return new DartClassDataProvider(this, this.element);
        }
    }

    get enum(): DartEnumDataProvider | undefined {
        if (this.element && this.element.kind === ElementKind.enum) {
            return new DartEnumDataProvider(this, this.element);
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
        return this.doc.lineAt(this.range?.start ?? this.selection.range.end);
    }

    /** 
     * The selected code (Class) range where the current {@link selection} is.
     */
    get range(): vscode.Range | undefined {
        return this.detectCodeRange(this.selection.range.start, regexp.classMatch);
    }

    /**
     * The method is similar to `document.getText()`,
     * but only searches in the text area of the selected code,
     * the rest of the content will be ignored.
     * @param range include only the text included in the range
     * @returns the text inside the provided range or the entire text.
     */
    getTextFromCode(range?: vscode.Range | undefined): string {
        const lines = this.codeLines.filter((l) => range && range.contains(l.range));
        return this.doc.getText(this.linesToRange(...lines));
    }

    /**
     * The text lines of the current code from {@link range}.
     */
    get codeLines(): vscode.TextLine[] {
        return this.rangeToLines(this.range);
    }

    /**
     * The text of the selected class.
     */
    get text(): string {
        return this.doc.getText(this.range);
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
    has(text: string) {
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
     * The range between last map item and last enclosed bracket `)`.
     * @param code An range of the `Map` method.
     * @returns An range inside the method.
     */
    withinMap(code: vscode.Range): vscode.Range {
        const lines = this.rangeToLines(code);
        const callback = this.whereCodeFirstLine((line) => line.text.includesOne('=>', 'return'), lines);
        const body = code.with(callback?.start, callback?.end);
        const line = lines.find((e) => e.text.indexOf('};') !== -1 || e.text.indexOf(');') !== -1);
        const lastLine = line ?? this.lineAt(body.end.line);
        const character = lastLine.text.indexOf(';') - 1;
        const end = lastLine.range.start.with({ character: character });
        const isOneLineMethod = this.lineAt(body.start.line).text.trimEnd().endsWith(';');
        const start = isOneLineMethod
            ? end
            : lastLine.range.start.with(
                lastLine.lineNumber - 1,
                this.lineAt(lastLine.lineNumber - 1).range.end.character,
            );

        return lastLine.range.with(start, end);
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

    command(command: vscode.Command): vscode.CodeAction {
        const action = new vscode.CodeAction(command.title, vscode.CodeActionKind.QuickFix);
        action.command = command;
        return action;
    }

    replace(...values: CodeActionValueReplace[]) {
        if (!this.editor) return;
        this.editor.edit((editBuilder) => {
            for (const element of values) {
                if (element.range !== undefined) {
                    editBuilder.replace(element.range, element.value);
                }
            }
        });
    }

    insert(...values: CodeActionValueInsert[]) {
        if (!this.editor) return;
        this.editor.edit((editBuilder) => {
            for (const element of values) {
                editBuilder.insert(element.position, element.insertion);
            }
        });
    }

    delete(...values: CodeActionValueDelete[]) {
        if (!this.editor) return;
        this.editor.edit((editBuilder) => {
            for (const element of values) {
                if (element.range !== undefined) {
                    editBuilder.delete(element.range);
                }
            }
        });
    }
}
