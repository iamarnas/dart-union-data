import * as vscode from 'vscode';
import { DartClassDataProvider } from '.';
import { ElementBuilder } from '../interface';
import { ClassDataTemplate } from '../templates';
import { regexp } from '../utils';
import { CodeReader } from './code-reader';

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
     * The end position of the code.
     */
    readonly end: vscode.Position;

    constructor(public editor: vscode.TextEditor) {
        super(editor.document);
        this.selection = editor.document.lineAt(editor.selection.start.line);
        this.end = this.range?.end ?? editor.selection.end;
    }

    get element(): ClassDataTemplate | undefined {
        return ElementBuilder.fromString(this.text).build();
    }

    get data(): DartClassDataProvider | undefined {
        if (this.element) {
            return new DartClassDataProvider(this, this.element);
        }
    }

    /**
     * The position of the first line of code.
     * @returns first line position.
     */
    get start() {
        return this.doc.lineAt(this.range?.start ?? this.selection.range.end);
    }

    /** 
     * The code range where the current {@link selection} is.
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
        return this.doc.getText(this.rangeFromTextLines(...lines));
    }

    /**
     * The text lines of the current code from {@link range}.
     */
    get codeLines(): vscode.TextLine[] {
        return this.textLinesFromRange(this.range);
    }

    /**
     * The text of the selected class.
     */
    get text(): string {
        return this.doc.getText(this.range);
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
    endPositionWithinCode() {
        return new vscode.Position(this.end.line, this.end.character - 1);
    }

    insertFix(
        position: vscode.Position,
        title: string,
        text: string,
    ): vscode.CodeAction {
        const fix = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();
        fix.isPreferred = true;
        fix.edit.insert(this.editor.document.uri, position, text);
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
        fix.edit.replace(this.editor.document.uri, range, text);
        return fix;
    }

    command(command: vscode.Command | undefined): vscode.CodeAction {
        const action = new vscode.CodeAction(command?.title ?? '', vscode.CodeActionKind.QuickFix);
        action.command = command;
        return action;
    }

    replace(...replacements: CodeValue[]) {
        this.editor.edit((editBuilder) => {
            replacements.forEach((element) => {
                if (element.range) {
                    editBuilder.replace(element.range, element.value)
                }
            });
        });
    }

    insert(...insertions: CodeValue[]) {
        this.editor.edit((editBuilder) => {
            insertions.forEach((element) => editBuilder.insert(element.position, element.replacement));
        });
    }
}

export interface CodeValue {
    value: string,
    replacement: string,
    position: vscode.Position,
    isGenerated: boolean,
    isUpdated: boolean,
    range: vscode.Range | undefined;
    fix(): vscode.CodeAction
}
