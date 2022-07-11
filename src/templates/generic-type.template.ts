import { GenericType, GenericTypeElement } from '../interface';
import '../types/string';
import { regexp } from '../utils';

/** 
 * @param input the string that contains the generic type.
 */
export class GenericTypeTemplate implements GenericTypeElement {
    types: GenericType[] = [];

    /**
     * The full generic type with extended types.
     * @example <T extends Object?>
     */
    displayType = '';

    constructor(private readonly input: string) {
        this.types = getGenericTypes(input);
        this.displayType = getGenericType(input);
    }

    get hasData(): boolean {
        return this.types.length !== 0;
    }

    /** 
     * The generic type without extended types.
     * @example <T, E>
     */
    get type(): string {
        if (!this.hasData) return '';
        const types = this.types.map((e) => e.type).join(', ');
        return `<${types}>`;
    }

    /**
     * @example '<$T, $E>'
     * @returns a string:
     */
    typeString(): string {
        if (!this.hasData) return '';
        const types = this.types.map((e) => `$${e.type}`);
        return `<${types.join(', ')}>`;
    }
}

export function hasGenericType(input: string): boolean {
    return regexp.genericType.test(input);
}

/**
 * Extracts generic type from the given string.
 * @param input the string that contains the generic type.
 * @param option allows extracting generic type instance without angle brackets if the `group` is `true`.
 * @returns generic type as a string. Otherwise, if not found, an empty string is returned.
 */
export function getGenericType(input: string, option?: { group: boolean }): string {
    if (!hasGenericType(input)) return '';
    const start = input.indexOf('<') + (option?.group ? 1 : 0);
    const end = input.indexOf('> ') !== -1
        ? input.indexOf('> ') + (option?.group ? 0 : 2)
        : input.lastIndexOf('>') + (option?.group ? 0 : 1);
    const genericType = input.slice(start, end).trim();
    const formatted = formatGenericType(genericType);
    return formatted;
}

/** Converts generic type from the given string into an object. */
function getGenericTypes(input: string): GenericType[] {
    const genericTypes: GenericType[] = [];
    if (!hasGenericType(input)) return genericTypes;
    const generics = getGenericType(input, { group: true });
    const split = generics.split(',').map((e) => e.trim());

    for (const element of split) {
        const extendable = element.includes('extends');

        if (extendable) {
            const type = element.split('extends')[0].trim();
            const extendableType = element.split('extends')[1].trim();
            genericTypes.push({
                type: type,
                extendableType: extendableType,
            });
        } else {
            genericTypes.push({ type: element });
        }
    }

    return genericTypes;
}

function formatGenericType(input: string): string {
    const isBadFormatted = /\s{2,}|,\S|<\s+|\s+>/g;
    if (!isBadFormatted) return input;
    return input.replace(/\s{2,}/g, ' ')
        .replace(/,\s*/g, ', ')
        .replace(/\s+,/g, ',')
        .replace(/<\s+/g, '<')
        .replace(/\s+>/g, '>');
}