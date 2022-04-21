import Argument from './argument';
import { ClassElement, Element, FieldElement } from './element';

class ElementBuilder {
    private input: string;

    constructor(input: string) {
        this.input = input;
    }

    static fromString(input: string): ElementBuilder {
        return new ElementBuilder(input);
    }

}

const data = (split: string[]): ClassElement | undefined => {
    const isEnum = split[0].trimStart().startsWith('enum ');
    const isAbstract = split[0].trimStart().startsWith('abstract ');
    const displayName = split[0].slice(split[0].indexOf('class') + 5).trim();
    const isGeneric = displayName.includes('<') && displayName.includes('>');
    const generic = isGeneric ? displayName.slice(displayName.indexOf('<'), displayName.indexOf('>') + 1) : '';
    const className = isGeneric ? displayName.replace(generic, '') : displayName;
    const fields: FieldElement[] = [];

    if (isEnum) {
        for (let i = 0; i < split.length; i++) {
            const field = split[i];
            const values = field[1].split(',');

            for (const name in values) {
                const fieldElement: FieldElement = {
                    name: name,
                    isConst: false,
                    isConstructor: false,
                    isPrivate: false,
                    isFactory: false,
                    element: {
                        name: name,
                        displayName: name,
                        arguments: []
                    },
                };

                fields.push(fieldElement);
            }

            return {
                name: className,
                displayName: displayName,
                isAbstract: isAbstract,
                isEnum: isEnum,
                fields: fields,
            } as ClassElement;
        }
    } else {
        for (let i = 0; i < split.length; i++) {
            const field = split[i];
            const isConst = field.includes('const ');
            const isFactory = field.includes('factory ');
            const argument = field.match(/\(.*\)/gm)?.join();
            const isPrivate = field.match(/ _\w*|\._\(.*\)/gm) !== null;
            const isConstructor = field.includes(className) && argument !== undefined && !isFactory;

            const fieldElement: FieldElement = {
                name: undefined,
                documentationComment: undefined,
                isConst: isConst,
                isConstructor: isConstructor,
                isPrivate: isPrivate,
                isFactory: isFactory,
                element: {
                    name: 'value',
                    displayName: 'value',
                    arguments: Argument.fromString(argument),
                }
            };

            fields.push(fieldElement);

            return {
                name: className,
                displayName: displayName,
                documentationComment: undefined,
                isAbstract: isAbstract,
                isEnum: isEnum,
                genericType: isGeneric ? {
                    type: generic.replace(/<|>/g, '').split(' ')[0],
                    displayName: generic,
                    extendsTo: generic.includes(' extends ') ?
                        generic.split(' ').splice(-1)[0].slice(0, -1) :
                        undefined,
                } : undefined,
                fields: fields,
                elementConstructor: undefined,
            } as ClassElement;
        }
    }
};

const split = (content: string, isEnum: boolean): string[] => {
    const start = 0;
    const end = isEnum ?
        content.indexOf('}') + 1 :
        content.indexOf('\n}\n') + 1;
    const comments = /(\/.*)|(\*.*)/gm;
    const empty = '';
    const toLine = (e: string): string => e.replace(/\n/gm, empty);
    const fixParentheses = (l: string): string => l.replace('( ', '(').replace(', )', ')');
    const fixCurlyBracket = (l: string): string => l.replace('{ ', '{').replace(', }', '}');
    const fixBrackets = (l: string): string => l.replace('[ ', '[').replace(', ]', ']');
    const fixSpaces = (l: string): string => l.replace(/\s{2,}/gm, ' ');
    const unwantedCharacters = (l: string): boolean => !l.match(/^$|^}$/i);
    // Clean all unwanted characters which contradict the dart language syntax.
    const cleanUnwantedCharacters = (l: string): string => {
        if (l.includes('return ')) {
            if (l.match(/\{|\}/gmi)) {
                return l.replace(/\{|\}/gmi, empty);
            }
        }

        if (l.trimStart().startsWith('}')) {
            return l.replace('}', empty).trim();
        }

        if (l.trimEnd().endsWith('}')) {
            return l.replace('}', empty).trim();
        }

        return l;
    };
    const body = content.slice(start, end)
        .replace(comments, empty)
        .replace('{', ';');
    const split = body.split(';')
        .map(toLine)
        .map(fixSpaces)
        .map(fixParentheses)
        .map(fixCurlyBracket)
        .map(fixBrackets)
        .map(cleanUnwantedCharacters)
        .filter(unwantedCharacters)
        .map((l) => l.trim());

    return split;
};