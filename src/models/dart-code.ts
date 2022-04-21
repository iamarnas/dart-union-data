export class DartCode {
    private content: string;

    constructor(content: string) {
        this.content = content;
    }

    get isEnum(): boolean {
        return this.content.trimStart().startsWith('enum ');
    }

    static fromString(input: string): DartCode {
        return new DartCode(input);
    }
}