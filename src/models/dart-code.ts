export class DartCode {
    private content: string;

    constructor(content = '') {
        this.content = content;
    }

    static isEnum(text: string): boolean {
        return text.trim().startsWith('enum ');
    }

    static fromString(text: string): DartCode {
        return new DartCode(text);
    }

    toDartCode(): string[] {
        const start = 0;
        const end = this.content.indexOf('\n}\n') !== -1 ?
            this.content.indexOf('\n}\n') + 2 :
            this.content.indexOf('}\n') + 1;
        const toLine = (e: string): string => e.replace(/\n/gm, '');
        const fixParentheses = (l: string): string => l.replace('( ', '(').replace(', )', ')');
        const fixCurlyBracket = (l: string): string => l.replace('{ ', '{').replace(', }', '}');
        const fixBrackets = (l: string): string => l.replace('[ ', '[').replace(', ]', ']');
        const fixSpaces = (l: string): string => l.replace(/\s{2,}/gm, ' ');
        const unwantedCharacters = (l: string): boolean => !l.match(/^$|}$/i);
        const cleanUnwantedCharacters = (l: string): string => {
            return l.includes('return') ? l.replace(/\{|\}/gmi, '') : l;
        };
        const body = this.content.slice(start, end).replace('{', ';');
        const split = body.split(';')
            .map(toLine)
            .map(fixSpaces)
            .map(fixParentheses)
            .map(fixCurlyBracket)
            .map(fixBrackets)
            .map(cleanUnwantedCharacters)
            .filter(unwantedCharacters)
            .map((l) => l.trim());

        return split;
    }
}