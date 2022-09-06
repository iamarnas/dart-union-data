import './array';

String.prototype.lengthOf = function (symbol: string): number {
    return String(this).split('').filter((e) => e === symbol).length;
};

String.prototype.decapitalize = function (): string {
    const str = String(this);
    return str.charAt(0).toLowerCase() + str.slice(1);
};

String.prototype.capitalize = function (): string {
    const str = String(this);
    return str.charAt(0).toUpperCase() + str.slice(1);
};

String.prototype.isBlank = function (): boolean {
    return (/^\s*$/).test(String(this));
};

String.prototype.isNotBlank = function (): boolean {
    return !String(this).isBlank();
};

String.prototype.includesOne = function (...items: string[]): boolean {
    return items.some((e) => String(this).includes(e));
};

String.prototype.includesAll = function (...items: string[]): boolean {
    return items.every((e) => String(this).includes(e));
};

String.prototype.insertAt = function (from: number | string, replacement: string): string {
    const str = String(this);

    if (typeof from === 'string') {
        if (str.indexOf(from) === -1) return str;
        const idx = str.indexOf(from) + from.length;
        return str.slice(0, idx) + replacement + str.slice(idx);
    }

    if (typeof from === 'number') {
        if (from > str.length) return str;
        return str.slice(0, from) + replacement + str.slice(from);
    }

    return str;
};

String.prototype.getRange = function (
    start: number | string,
    end?: number | string,
    between?: boolean,
): string {
    const str = String(this);
    let _start: number = typeof start === 'string' ? str.indexOf(start) : start;

    if (_start === -1 || _start > str.length) return str;

    if (typeof start === 'string' && between) {
        _start = _start + 1;
    }

    if (end !== undefined) {
        let _end: number = typeof end === 'string' ? str.lastIndexOf(end) : end;

        if (_end === -1 || _end > str.length) {
            return str.slice(_start);
        }

        if (typeof end === 'string') {
            if (between) {
                _end = _end - 1;
            }

            return str.slice(_start, _end + end.length);
        }

        return str.slice(_start, _end);
    }

    return str.slice(_start);
};

String.prototype.splitWhere = function (separator: string, from: string, to: string): string[] {
    const split = String(this).split('');
    const result = [];
    let copy = '';

    for (const element of split) {
        copy = copy.concat(element);

        if (copy.indexOf(from) !== -1
            && copy.lastIndexOf(to) !== -1
            && copy.endsWith(separator)) {
            result.push(copy.slice(0, -1));
            copy = '';
        }

        if (copy.indexOf(from) === -1
            && copy.lastIndexOf(to) === -1
            && copy.endsWith(separator)) {
            result.push(copy.slice(0, -1));
            copy = '';
        }
    }

    // Push, if matches not found.
    result.push(copy);

    return result.map((e) => e.trim()).filter(Boolean);
};