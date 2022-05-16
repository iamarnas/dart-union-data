import * as path from 'path';
import { workspace } from 'vscode';
import fm from './file-manager';

class Pubspec {
    protected data: string;

    constructor() {
        workspace.createFileSystemWatcher('**/pubspec.yaml').onDidChange(() => {
            this.reloadData();
        });
        this.data = getPubspecFileData();
    }

    private reloadData() {
        this.data = getPubspecFileData();
    }

    private get split(): string[] {
        return this.data.split('\n');
    }

    get hasData(): boolean {
        return this.data !== '';
    }

    get hasEquatable(): boolean {
        return this.split.some((e) => e.startsWith('  equatable:'));
    }

    /**
     * Returns the current version of the Dart SDK.
     * If the current version is not found, returns the default version `2.12.0`.
     */
    get sdkVersion(): number {
        var sdk = this.split.find((e) => e.startsWith('  sdk:')) ?? '2.12.0';
        const match = /\d\.\d\d\.\d/;
        const version = match.exec(sdk)![0];
        return Number.parseFloat(version);
    }
}

/** 
 * Returns `pubspec.yaml` file data. 
 * If the file does not found or does not exist returns an empty string.
 */
function getPubspecFileData(): string {
    if (!fm.workspaceRoot) return '';
    const pubspec = path.join(fm.workspaceRoot, 'pubspec.yaml');
    if (!fm.existsSync(pubspec)) return '';
    return fm.readFile(pubspec);
}

const pubspec = new Pubspec();
export default pubspec;