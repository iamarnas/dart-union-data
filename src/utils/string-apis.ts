
declare global {
    interface String {
        decapitalize(): string;
        capitalize(): string;
        isBlack(): boolean;
        isNotBlack(): boolean;
    }
}

String.prototype.decapitalize = function (): string {
    return decapitalize(String(this));
};

String.prototype.capitalize = function (): string {
    return capitalize(String(this));
};

String.prototype.isBlack = function (): boolean {
    return (/^\s*$/).test(String(this));
};

String.prototype.isNotBlack = function (): boolean {
    return !(/^\s*$/).test(String(this));
};

function zip<L, R>(left: L[], right: R[], separator?: string, divider = ' '): string {
    return left.map((e, i) => `${e}${divider}${right[i]}`).join(separator);
}

function trim(intput: string): string {
    return intput.trim();
}

function decapitalize(input: string) {
    return input.charAt(0).toLowerCase() + input.slice(1);
}

function capitalize(input: string) {
    return input.charAt(0).toUpperCase() + input.slice(1);
}

export { zip, trim };
