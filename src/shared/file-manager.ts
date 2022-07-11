import * as fs from 'fs';
import * as path from 'path';
import getWorkspaceRoot from './workspace';

class FileManager {
    readonly workspaceRoot?: string;

    constructor() {
        this.workspaceRoot = getWorkspaceRoot();
    }

    existsSync(path: string): boolean {
        return fs.existsSync(path);
    }

    readFile(path: string): string {
        return fs.readFileSync(path, 'utf-8');
    }

    readFileFromWorkspace(...paths: string[]) {
        if (!this.workspaceRoot) return;
        const filePath = path.join(this.workspaceRoot, ...paths);
        if (!this.existsSync(filePath)) return;
        return this.readFile(filePath);
    }
}

const fm = new FileManager();
export default fm;