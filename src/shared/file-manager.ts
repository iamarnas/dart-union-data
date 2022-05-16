import * as fs from 'fs';
import getWorkspaceRoot from './workspace';

class FileManager {
    readonly workspaceRoot?: string;

    constructor() {
        this.workspaceRoot = getWorkspaceRoot();
    }

    get isWorkspaceOpen(): boolean {
        return this.workspaceRoot !== undefined;
    }

    existsSync(path: string): boolean {
        return fs.existsSync(path);
    }

    readFile(path: string): string {
        return fs.readFileSync(path, 'utf-8');
    }
}

const fm = new FileManager();
export default fm;