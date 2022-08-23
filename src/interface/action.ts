import { CodeAction, Position, Range } from 'vscode';

export interface ActionValue {
    value: string;
    insertion: string,
}

export interface CodeActionValue extends ActionValue {
    position: Position,
    isGenerated: boolean,
    isUpdated: boolean,
    range: Range | undefined;
    fix(): CodeAction;
    update(): void,
    delete(): void,
}

export type CodeActionValueReplace = Pick<CodeActionValue, 'range'> & Required<Pick<CodeActionValue, 'value'>>;
export type CodeActionValueDelete = Pick<CodeActionValue, 'range'>;
export type CodeActionValueInsert = Required<Pick<CodeActionValue, 'position' | 'insertion'>>;
