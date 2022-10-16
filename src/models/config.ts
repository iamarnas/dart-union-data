import * as vscode from 'vscode';

class Configuration {
    lineLength: number;
    constructor() {
        this.lineLength = this.getLineLenght();

        vscode.workspace.onDidChangeConfiguration((event) => {
            console.log(this.lineLength);
            console.log(event);
            this.lineLength = this.getLineLenght();
        });
    }

    private getLineLenght(): number {
        return vscode.workspace.getConfiguration('dart').get('lineLength') ?? 80;
    }
}

const config = new Configuration();

export { config };
