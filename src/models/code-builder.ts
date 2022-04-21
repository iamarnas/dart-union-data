class CodeBuilder {
    private content: string;

    constructor(content: string) {
        this.content = content;
    }

    static fromString(input: string): CodeBuilder {
        return new CodeBuilder(input);
    }

}
