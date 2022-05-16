import Argument from '../models/argument';
import regexp from '../utils/regexp';
import { trim } from '../utils/string-apis';

/**
 * Return [Argument] list from the given string.
 * If no constructor is found in the given string, empty list returns.
 */
export function extractArguments(input: string): Argument[] {
    if (!hasConstructor(input)) return [];
    const parameters: Argument[] = [];
    const params = extractAllParameters(input);
    // Interrupt the process if no parameters are found.
    if (!params.length) return [];
    const namedParams = extractNamedParameters(input);
    const positionalParams = extractPositionalParameters(input);

    for (const line of params) {
        const parameter = new Argument();

        if (namedParams.length) {
            if (namedParams.includes(line)) {
                const split = line.split(' ');

                if (split.includes('final')) {
                    parameter.isFinal = true;
                    split.removeFirst();
                }

                if (split.includes('required')) {
                    parameter.isRequired = true;
                    split.removeFirst();
                }

                if (split.includes('=')) {
                    parameter.defaultValue = split.removeLast() ?? '';
                }

                parameter.type = split[0];
                parameter.name = split[1];
                parameter.isNamed = true;
                parameter.isOptional = true;
                parameter.isNullable = split[0].includes('?');
            }
        }

        if (positionalParams.length) {
            if (positionalParams.includes(line)) {
                const split = line.split(' ');

                if (split.includes('final')) {
                    parameter.isFinal = true;
                    split.removeFirst();
                }

                if (split.includes('=')) {
                    parameter.defaultValue = split.removeLast() ?? '';
                }

                parameter.name = split[1];
                parameter.type = split[0];
                parameter.isOptional = true;
                parameter.isPositional = true;
                parameter.isNullable = split[0].includes('?') ?? false;
            }
        }

        if (!namedParams.includes(line) && !positionalParams.includes(line)) {
            const split = line.split(' ');

            if (split.includes('final')) {
                parameter.isFinal = true;
                split.removeFirst();
            }

            parameter.name = split[1];
            parameter.type = split[0];
            parameter.isNullable = split[0].includes('?') ?? false;
        }

        parameters.push(parameter);
    }

    return parameters.sort((a, b) => Number(a.isOptional) - Number(b.isOptional));
}

/**
 * Extracts only positional optional parameters from the given string.
 * @param input a string that contains the constructor.
 * @returns a string list with positional optional parameters.
 */
function extractPositionalParameters(input: string): string[] {
    const match = /\[(.*)\]/;
    if (!match.test(input)) return [];
    const group = extractConstructor(input, { group: true });
    const params = match.exec(group)![1].split(',').map(trim);
    return group.isNotBlack() ? params : [];
}

/**
 * Extracts only named optional parameters from the given string.
 * @param input a string that contains the constructor.
 * @returns a string list with named optional parameters.
 */
function extractNamedParameters(input: string): string[] {
    const match = /\{(.*)\}/;
    if (!match.test(input)) return [];
    const group = extractConstructor(input, { group: true });
    const params = match.exec(group)![1].split(',').map(trim);
    return group.isNotBlack() ? params : [];
}

/**
 * Extracts all constructor parameters from the given string regardless of type.
 * @param {string} input a string that contains the constructor.
 * @returns a string list with parameters.
 */
function extractAllParameters(input: string): string[] {
    if (!hasConstructor) return [];
    const match = /\{|\}|\[|\]/g;
    const group = extractConstructor(input, { group: true });
    const params = group.replace(match, '').split(',').map(trim);
    return group.isNotBlack() ? params : [];
}

/**
 * Checks if a given string has a constructor.
 * @param {string} input a string to check given matches.
 * @returns `true` if a given string has a constructor.
 */
export function hasConstructor(input: string): boolean {
    return regexp.constructorMatch.test(input);
}

/**
 * Extracts Dart constructor from the given string. Ex: `"(...)"`.
 * @param {string} input a string to check given matches.
 * @param option output option. If `true`, returns only arguments without parentheses.
 * @returns a processed string on match otherwise given string.
 */
function extractConstructor(input: string, option?: { group: boolean }): string {
    if (!hasConstructor(input)) return input;
    if (option?.group) return regexp.constructorMatch.exec(input)![1].trim();
    return regexp.constructorMatch.exec(input)![0].trim();
}

