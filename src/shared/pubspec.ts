import { workspace } from 'vscode';
import fm from './file-manager';

class Pubspec {
    protected data: string;

    constructor() {
        workspace.createFileSystemWatcher('**/pubspec.yaml').onDidChange(() => {
            this.reloadData();
        });
        this.data = this.getContent();
    }

    private reloadData() {
        this.data = this.getContent();
    }

    private get split(): string[] {
        if (this.data === '') return [];
        return this.data.split('\n');
    }

    get isEmpty(): boolean {
        return this.split.length === 0;
    }

    get isNotEmpty(): boolean {
        return !this.isEmpty;
    }

    get hasEquatable(): boolean {
        return this.data.includes('equatable:');
    }

    get hasCollection(): boolean {
        return this.data.includes('collection:');
    }

    get projectName(): string {
        const name = this.split.find((e) => e.startsWith('name: ')) ?? '';
        return name.slice('name: '.length).trim();
    }

    get isFlutter(): boolean {
        return this.data.includes('flutter:') && this.data.includes('sdk: flutter');
    }

    /**
     * Returns the current version of the Dart SDK.
     * If the current version is not found, returns the default version `2.12.0`.
     */
    get sdkVersion(): number {
        const sdk = this.split.find((e) => e.startsWith('  sdk:')) ?? '2.12.0';
        const match = /\d\.\d\d\.\d/;
        const version = match.exec(sdk)?.[0] ?? '2.12.0';
        return Number.parseFloat(version);
    }

    /** 
     * Returns `pubspec.yaml` file content. 
     * If the file does not found or does not exist returns an empty string.
     */
    getContent(): string {
        const content = fm.readFileFromWorkspace('pubspec.yaml');

        if (!content) {
            console.info('Failed to read pubspec.yaml file contents');
            return '';
        }

        return content;
    }
}

const pubspec = new Pubspec();
export default pubspec;