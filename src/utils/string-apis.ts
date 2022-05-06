/**
 * Adds all the elements of an array into a string, separated by the specified separator string.
 * If the separator has the next line `\n`, the separator will be added after the last value.
 * @param args arguments for separation.
 * @param separator A string is used to separate one element of the array from the next in the resulting string.
 * If omitted, the array elements are separated with a comma.
 * @returns a string.
 */
function join<T>(args: T[], separator?: string): string {
    const newln = separator?.includes('\n') ?? false;
    const start = newln ? '\n' : '';
    const end = newln ? separator : '';
    return `${start}${args.join(separator)}${end}`;
}

function zip<L, R>(left: L[], right: R[], separator?: string, divider = ' '): string {
    const values = left.map((e, i) => `${e}${divider}${right[i]}`);
    return join(values, separator);
}

function trim(intput: string): string {
    return intput.trim();
}

function firstLetterToLowerCase(input: string) {
    return input.charAt(0).toLowerCase() + input.slice(1);
}

export { join, zip, trim, firstLetterToLowerCase };

