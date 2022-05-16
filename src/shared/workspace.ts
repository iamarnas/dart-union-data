import * as vscode from 'vscode';

/** Returns the directory of the workspace. */
export default function getWorkspaceRoot(): string | undefined {
    const text = "Couldn't find the workspace folder. Open the folder and try again.";
    const folders = vscode.workspace.workspaceFolders;
    const workspaceRoot = (folders && (folders.length > 0))
        ? folders[0].uri.path
        : undefined;

    if (!workspaceRoot) {
        vscode.window.showErrorMessage(text);
        return;
    }

    return workspaceRoot;
}
