import { regexp } from '../utils/regexp';
import { trim } from '../utils/string-apis';
import { FieldData } from '../models/field-data';
import ClassData from '../models/class.data';
import { ConstructorData, isNamedConstructor } from '../models/constructor.data';
import { hasParams } from '../models/argument';

export class ElementBuilder {
    constructor(private readonly code: string) { }

    static fromString(code: string): ElementBuilder {
        return new ElementBuilder(code);
    }

    buildElement(): ClassData | undefined {
        const split = codeSplit(this.code);
        return buildFromSplit(split);
    }
}

function buildFromSplit(split: string[]): ClassData | undefined {
    if (!split.length) return;
    const element = new ClassData(split[0]);

    // Handle enum data.
    if (element.isEnum) {
        for (const value of element.enumValues) {
            const field = new FieldData('', value);
            element.addField(field);
        }

        return element;
    }

    // Handle fields and constructors.
    for (let i = 0; i < split.length; i++) {
        const field = split[i];
        const containsAnyConstructor = isNamedConstructor(field) && field.includes(element.name) ||
            field.includes(element.name) && hasParams(field);

        if (containsAnyConstructor) {
            const constructor = new ConstructorData(element, field);
            element.addConstructor(constructor);
        }
    }

    // TODO: remove test.
    console.log(element);
    return element;
}

/**
 * A function that divides data classes into strings.
 * @param {string} content Dart language data class string.
 * @returns a string list.
 */
function codeSplit(content: string): string[] {
    const isEnum = content.trimStart().startsWith('enum ');
    const start = 0;
    const end = isEnum ?
        content.indexOf('}') + 1 :
        content.indexOf('\n}\n') + 1;
    // Split data class properties into the one line with valid syntax.
    const body = content.slice(start, end)
        // Clean all comments.
        .replace(regexp.commentsMatch, '')
        // Separate class head from the body. Gets on index 0.
        .replace('{', ';');
    const split = body.split(';')
        .map(toOneLine)
        .map(fixSpaces)
        .map(fixParenthesesSyntax)
        .map(fixCurlyBracketsSyntax)
        .map(fixBracketsSyntax)
        .map(cleanUnwantedCharacters)
        .filter(Boolean)
        .map(trim);
    // Combine the enum name and values into a single line
    // by adding a `+` separator to separate them later.
    return isEnum ? [`${split[0]}+${split[1]}`, ...split.slice(2)] : split;
}

function toOneLine(input: string): string {
    return input.replace(/\n/g, '');
}

function fixParenthesesSyntax(line: string): string {
    return line.replace('( ', '(').replace(', )', ')');
}
function fixCurlyBracketsSyntax(line: string): string {
    return line.replace('{ ', '{').replace(', }', '}');
}

function fixBracketsSyntax(line: string): string {
    return line.replace('[ ', '[').replace(', ]', ']');
}

function fixSpaces(line: string): string {
    return line.replace(/\s{2,}/g, ' ');
}

// Clean all unwanted characters which contradict the dart language syntax.
function cleanUnwantedCharacters(line: string): string {
    const startsWithCluryBracket = /^\s*\}/;
    const cluryBracket = /\{|\}/g;

    if (line.includes('return ')) {
        if (cluryBracket.test(line)) {
            return line.replace(cluryBracket, '').trim();
        }
    }

    if (startsWithCluryBracket.test(line)) {
        return line.replace(startsWithCluryBracket, '').trim();
    }

    if (line.endsWith('}')) return line.replace('}', '').trim();

    return line;
}