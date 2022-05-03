import { regexp } from '../utils/regexp';
import { ParameterElement } from './element';

export default class Argument implements ParameterElement {
    name: string = '';
    type: string = '';
    value: string = '';
    nullable: boolean = false;
    isRequired: boolean = false;
    isNamed: boolean = false;
    isOptional: boolean = false;
    isPositional: boolean = false;
    defaultValue: string = '';

    static fromString(input?: string): Argument[] {
        return input ? argumentsFromString(input) : [];
    }
}

/**
 * Generates arguments list from the given string. 
 * 
 * Arguments string must contains constructor parentheses `"(...)"` to be processed
 * otherwise returns the empty list.
 * @param {string} input a valid Dart constructor with arguments as `string`.
 * @returns a list Argument[].
 */
function argumentsFromString(input: string): Argument[] {
    if (!hasParams(input)) return [];

    const parameters: Argument[] = [];
    const group = getParams(input, { group: true });

    if (!group.length) return [];

    const params = getAllParamsWithoutBrackets(group);
    const namedParams = getNamedParams(group);
    const positionalParams = getPositionalParams(group);

    for (let i = 0; i < params.length; i++) {
        const line = params[i];
        const parameter = new Argument();

        if (namedParams.length) {
            if (namedParams.includes(line)) {
                const split = line.split(' ');

                if (split.includes('required')) {
                    parameter.isRequired = true;
                    split.shift();
                }

                if (split.includes('=')) {
                    parameter.defaultValue = split.pop() ?? '';
                }

                parameter.type = split[0];
                parameter.name = split[1];
                parameter.isNamed = true;
                parameter.isOptional = true;
                parameter.nullable = split[0].includes('?');
            }
        }

        if (positionalParams.length) {
            if (positionalParams.includes(line)) {
                const split = line.split(' ');

                if (split.includes('=')) {
                    parameter.defaultValue = split.pop() ?? '';
                }

                parameter.name = split[1];
                parameter.type = split[0];
                parameter.isOptional = true;
                parameter.isPositional = true;
                parameter.nullable = split[0].includes('?') ?? false;
            }
        }

        if (!namedParams.includes(line) && !positionalParams.includes(line)) {
            const split = line.split(' ');
            parameter.name = split[1];
            parameter.type = split[0];
            parameter.nullable = split[0].includes('?') ?? false;
        }

        parameters.push(parameter);
    }

    return parameters.sort((a, b) => Number(a.isOptional) - Number(b.isOptional));
}

function getPositionalParams(input: string): string[] {
    const match = /\[(.*)\]/;
    if (!match.test(input)) return [];
    return match.exec(input)![1].split(',').map((e) => e.trim());
}

function getNamedParams(input: string): string[] {
    const match = /\{(.*)\}/;
    if (!match.test(input)) return [];
    return match.exec(input)![1].split(',').map((e) => e.trim());
}

function getAllParamsWithoutBrackets(input: string): string[] {
    const match = /\{|\}|\[|\]/g;
    return input.replace(match, '').split(',').map((e) => e.trim());
}

export function hasParams(input: string): boolean {
    return regexp.paramsMatch.test(input);
}

/**
 * Returns string match with parentheses `"(...)"`.
 * If the group is `true` returns group from the inside parentheses
 * @param input a string to check given matches.
 * @param option output option.
 * @returns a processed string on match otherwise given string.
 */
function getParams(input: string, option?: { group: boolean }): string {
    if (!hasParams(input)) return input;
    if (option?.group) return regexp.paramsMatch.exec(input)![1].trim();
    return regexp.paramsMatch.exec(input)![0].trim();
}

function getWithoutParams(input: string): string {
    return input.replace(regexp.paramsMatch, '');
}