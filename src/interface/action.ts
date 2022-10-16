import { CodeAction, Position, Range } from 'vscode';

export type CodeActionValueReplace = Pick<CodeActionValue, 'range'> & Required<Pick<CodeActionValue, 'value'>>;
export type CodeActionValueDelete = Pick<CodeActionValue, 'range'>;
export type CodeActionValueInsert = Required<Pick<CodeActionValue, 'position' | 'insertion'>>;

export interface ActionValue {
    /**
     * The value to replace or write to the document.
     */
    value: string;

    /**
     * The insertion value normalized with '\n'.
     * Used to insert value to the document.
     */
    insertion: string,

    /**
     * A value key to identify the value or start line of value.
     */
    key: string,
}

export interface CodeActionValue extends ActionValue {
    position: Position,
    isGenerated: boolean,
    isUpdated: boolean,
    range: Range | undefined;
    fix(): CodeAction;
    update(): Promise<void>,
    delete(): Promise<void>,
}

export interface MultiCodeActionValue extends CodeActionValue {
    insertions: CodeActionValue[],
    replacements: CodeActionValue[],
    removals: Range[],
}
