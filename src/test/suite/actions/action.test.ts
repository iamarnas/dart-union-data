import * as assert from 'assert';
import { describe, it } from 'mocha';
import * as vscode from 'vscode';
import { DartCodeProvider } from '../../../code-actions/dart/dart-code-provider';

function randomName() {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
    return Math.random().toString(36).slice(2, 7).replace(/\d/g, randomLetter);
}

const data = `
enum AppStatus {
    loading('l'),
    error('e'),
    succes('s');
  
    const AppStatus(this.code);
  
    final String code;
}
  
enum Result { loading, error, data }
`;

suite('Enum Code Provider Suite', () => {
    let editor: vscode.TextEditor;
    let document: vscode.TextDocument;

    suiteSetup(async () => {
        const editor = vscode.window.activeTextEditor;

        if (editor) {
            await editor.edit((editBuilder) => {
                editBuilder.insert(editor.selection.active, data);
            });

            document = editor.document;
        }
    });

    describe('enum code action', () => {
        it('should return undefined elements if selection did not contain class', () => {
            const provider = new DartCodeProvider(document, document.lineAt(0).range);

            if (!provider.data || !provider.enum) {
                assert.ok(true);
            } else {
                assert.ok(false, 'should be all undefined');
            }
        });

        it('should contain enum first line at index 1', () => {
            assert.strictEqual(document.lineAt(1).text.includes('enum AppStatus {'), true);
        });
    });
});