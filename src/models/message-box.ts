import * as vscode from 'vscode';

export default class MessageBox {
    static showError(message: string) {
        vscode.window.showErrorMessage(message);
    }

    static showWarning(message: string) {
        vscode.window.showWarningMessage(message);
    }

    static showInformation(message: string) {
        vscode.window.showInformationMessage(message);
    }
}