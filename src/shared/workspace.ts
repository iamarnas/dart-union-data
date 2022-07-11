import * as vscode from 'vscode';

/** Returns the directory of the workspace. */
export default function getWorkspaceRoot(): string | undefined {
    const text = "Couldn't find the workspace folder. Open the folder and try again.";
    const { workspaceFolders } = vscode.workspace;
    const workspaceRoot = (workspaceFolders && (workspaceFolders.length > 0))
        ? workspaceFolders[0].uri.path
        : undefined;

    if (!workspaceRoot) {
        vscode.window.showErrorMessage(text);
        return;
    }

    return workspaceRoot;
}
