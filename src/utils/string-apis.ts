import { regexp } from './regexp';

function zip<L, R>(left: L[], right: R[], separator?: string, divider = ' '): string {
    return left.map((e, i) => `${e}${divider}${right[i]}`).join(separator);
}

function trim(intput: string): string {
    return intput.trim();
}

function identicalCode(a: string, b: string): boolean {
    const x = a.trim().split('\n').map((e) => e.trim().replace(/,$/, '').replace(/\s*/, '')).join('');
    const y = b.trim().split('\n').map((e) => e.trim().replace(/,$/, '').replace(/\s*/, '')).join('');
    return x === y;
}

function stringLine(text: string): string {
    return text.split('\n').map(trim).join('');
}

function findCodeBlock(input: string) {
    const hasCurly = input.indexOf('{') !== -1;
    const hasParentheses = input.indexOf('(') !== -1;
    const openBraket = hasCurly ? '{' : '(';
    const closeBraket = hasCurly ? '}' : ')';
    const error = `Could not find code from the given first line: ${input}. Check if your code is valid and includes '{}' or '()' brackets.`;
    let a = 0, b = 0;

    if (!hasCurly && !hasParentheses) {
        console.error(error);
        return input;
    }

    const split = input.split('\n');
    const result: string[] = [];

    for (const line of split) {
        if (regexp.startOfComment.test(line)) continue;
        a = a + line.lengthOf(openBraket);
        b = b + line.lengthOf(closeBraket);
        result.push(line);

        if (a === b) {
            return result.join('\n');
        }
    }

    return input;
}

export { zip, trim, identicalCode, stringLine, findCodeBlock };
