import { ArgumentElement } from './element';

export default class Argument implements ArgumentElement {
    name: string;
    type: string;
    value: string;
    nullable: boolean = false;
    isRequired: boolean = false;
    isNamed: boolean = false;
    isOptional: boolean = false;
    isPositional: boolean = false;
    defaultValue: string;

    constructor(name: string, type: string) {
        this.name = name;
        this.type = type;
        this.value = '';
        this.defaultValue = '';
    }

    static fromString(input?: string): Argument[] {
        return input ? argumentsFromString(input) : [];
    }
}

/**
 * Generates arguments list from the given string. 
 * 
 * Arguments must be wrapped by parentheses `"(...)"` as string.
 * @param {string} text a valid Dart constructor with arguments as `string`.
 * @returns a list Argument[].
 */
const argumentsFromString = (input: string): Argument[] => {
    const parameters: Argument[] = [];
    const body = input.slice(input.indexOf('(') + 1, input.indexOf(')')).trim();
    const brackets = /{|}|\[|\]/gm;
    const curlyBrackets = /{|}/gm;
    const squareBrackets = /\[|\]/gm;

    if (!body.length) {
        return [];
    }

    const allParams = body.split(',').map((e) => e.match(brackets) ?
        e.replace(brackets, '').trim() :
        e.trim()
    );

    const namedParams = body.match(curlyBrackets) ?
        body.slice(body.indexOf('{') + 1, body.indexOf('}'))
            .split(',')
            .map((e) => e.trim()) : [];

    const positionalParams = body.match(squareBrackets) ?
        body.slice(body.indexOf('[') + 1, body.indexOf(']'))
            .split(',')
            .map((e) => e.trim()) : [];

    for (let i = 0; i < allParams.length; i++) {
        const line = allParams[i];
        const parameter = new Argument('', '');

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
};

export function constructorBuilder(input: string, prefix = 'this.'): string {
    const empty = /^\(\s*\)$/i;
    const brackets = /{|}|\[|\]|\(|\)/g;

    if (!input.match(empty) || !input.length) { return '()'; }

    const types = input.split(',')
        .map((e) => e.match(brackets) ?
            e.replace(brackets, '').trim() :
            e.trim())
        .join()
        .split(/\s|,/gm)
        .filter((_, i) => i % 2 === 0)
        .map((t) => t + ' ')
        .map((t) => t.includes('?') ? t.replace('?', '\\?') : t);
    const search = new RegExp(types.join('|'), 'gm');

    return input.replace(search, prefix);
}