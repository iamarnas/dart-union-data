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

export { zip, trim, identicalCode, stringLine };

