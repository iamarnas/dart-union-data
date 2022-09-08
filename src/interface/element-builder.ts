import { Settings } from '../models/settings';
import pubspec from '../shared/pubspec';
import { ClassDataTemplate, hasConstructor, ParametersTemplate, SubclassTemplate } from '../templates';
import { regexp, trim } from '../utils';
import { ConstructorElement, ElementKind, FieldElement } from './element';

type FieldBuilderProperties = {
    jsonKey: string,
    enums: string[],
    isEnum: boolean,
    value: string,
    field: string,
};

const ignoredItems = ['if ', 'while ', 'try ', 'catch ', 'for ', 'do ', 'switch ', 'void ', 'static ', '=> ', 'return ', 'import ', 'part '] as const;

export class ElementBuilder {
    constructor(private readonly code: string) { }

    static fromString(code: string): ElementBuilder {
        return new ElementBuilder(code);
    }

    build(): ClassDataTemplate | undefined {
        const split = codeSplit(this.code);
        const classData = buildFromSplit(split);
        return classData;
    }
}

function buildFromSplit(split: string[]): ClassDataTemplate | undefined {
    if (!split.length) return;

    const sttings = new Settings({
        sdkVersion: pubspec.sdkVersion,
        useEquatable: split[0].includes(' Equatable'),
        useAccurateCopyWith: true,
    });

    const element = new ClassDataTemplate(split[0], sttings);

    // Detect enum...
    if (element.isEnum) {
        const members = element.isEnhancedEnum
            ? element.enumMembers.map((e) => e.slice(0, e.indexOf('(')))
            : element.enumMembers;

        for (const member of members) {
            const field: FieldElement = {
                name: member,
                isConst: false,
                isPrivate: isPrivate(member),
                kind: element.kind,
                element: {
                    name: member,
                    displayName: member,
                    parameters: ParametersTemplate.from(''),
                }
            };

            element.addField(field);
        }

        return element;
    }

    // Detect constructors and variables...
    for (const field of split) {
        // Skip the unwanted fields...
        if (field.includesOne(...ignoredItems)) continue;

        /**
         * The matches for all remarks as comments or annotations
         * that were skipped using the {@link codeSplit code splitter}.
         */
        const match = regexp.combine(
            regexp.enumComment,
            regexp.startOfComment,
            regexp.specificEnumComment,
            regexp.jsonKeyComment,
            regexp.anyAnnotation,
        );

        // Detect user settings...
        const hasEnumComment = regexp.enumComment.test(field);
        const hasJsonKeyAnnotation = regexp.jsonKeyAnnotation.test(field);
        const enumsMatch = regexp.specificEnumComment.exec(field)?.at(1) ?? '';
        const enumsMembers = enumsMatch.split(',').map(trim).filter(Boolean);
        const jsonKeyComment = regexp.jsonKeyComment.exec(field)?.at(1) ?? '';
        const jsonKeyAnnotation = hasJsonKeyAnnotation ? regexp.jsonKeyName.exec(field)?.at(1) : undefined;

        // Field properties...
        const properties: FieldBuilderProperties = {
            jsonKey: jsonKeyAnnotation ?? jsonKeyComment,
            enums: enumsMembers,
            isEnum: hasEnumComment || enumsMembers.length !== 0,
            value: field.replace(match, '').trim(),
            field: field,
        };

        // Detect constructor...
        const containsAnyConstructor = ConstructorElement.isNamed(field) && field.includes(element.name)
            || field.includes(element.name) && hasConstructor(field);

        // Detect class instance variable...
        const isInstanceVarialble = regexp.primitiveValue.test(properties.value)
            || regexp.variableMatch.test(properties.value);

        // Detect multi values in one line.
        const isMultipleValuesInline = regexp.multipleValuesInline.test(properties.value);

        // Detect class function variable...
        const isFuncVariable = regexp.functionType.test(properties.value);

        // Detect getters...
        const isGetter = regexp.getterMatch.test(properties.value);

        if (hasEnumComment) {
            const enumFieldElement = createCommentedEnumFieldElement(properties);
            element.addField(enumFieldElement);
        }

        if (isInstanceVarialble) {
            const instanceVariableElement = createInstanceVariableFieldElement(properties);

            if (instanceVariableElement === undefined) continue;

            element.addField(instanceVariableElement);
        }

        if (isMultipleValuesInline) {
            const elements = createMultipleValueFieldElements(properties);
            element.addField(...elements);
        }

        if (isGetter) {
            const getter = createGetterFieldElement(properties);

            if (getter === undefined) continue;

            element.addField(getter);
        }

        if (isFuncVariable) {
            const funcFieldElement = createFuncFieldElement(properties);

            if (funcFieldElement === undefined) continue;

            element.addField(funcFieldElement);
        }

        if (containsAnyConstructor) {
            const isInitialized = ConstructorElement.isFactory(field)
                && (field.includes('=>') || field.includes('return '));

            if (isInitialized) continue;

            const constructor = new SubclassTemplate(element, field);

            element.addConstructor(constructor);
        }
    }

    return element;
}

/**
 * A function that divides data classes into strings.
 * @param {string} content Dart language data class string.
 * @returns a string list.
 */
function codeSplit(content: string): string[] {
    const isEnum = content.trimStart().startsWith('enum ');
    // Split data class properties into the one line with valid syntax.
    const body = content.split('\n').map((e) => {
        // Clean all comments by allowing just some keywords.
        if (regexp.enumComment.test(e)) return e.trim();
        if (regexp.startOfComment.test(e) && (
            regexp.jsonKeyComment.test(e) ||
            regexp.specificEnumComment.test(e)
        )) return e.trim();
        if (!regexp.comment.test(e)) return e;
        return e.replace(regexp.comment, '').trim();
    })
        .filter(Boolean).join('\n')
        // Separate class head from the body. For to get on index 0 later.
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
    return line.replace(/\(\s+/, '(').replace(/,\s*\)/, ')');
}
function fixCurlyBracketsSyntax(line: string): string {
    return line.replace(/\{\s+/, '{').replace(/,\s*\}/, '}');
}

function fixBracketsSyntax(line: string): string {
    return line.replace(/\[\s+/, '[').replace(/,\s*\]/, ']');
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

/**
 * Extract multiple values from a single line.
 * @param input a string with multiple values.
 * @returns a list with values.
 * @example from 'String a, b' to ['String a', 'String b']
 */
function getMultipleValuesFromLine(input: string): string[] {
    const match = regexp.multipleValuesInline.exec(input);

    if (!match) return [];

    const modifier = match[1];
    const type = match[2];
    const generic = match[3];
    const body = `${modifier}${type}${generic}`;

    return match[4].split(',').map((e) => `${body}${e.trim()}`);
}

export function isPrivate(input: string): boolean {
    return regexp.privacy.test(input);
}

function createInstanceVariableFieldElement(properties: FieldBuilderProperties): FieldElement | undefined {
    const parameters = ParametersTemplate.from(`(${properties.value})`);
    const param = parameters.all.at(0);

    if (!param) return;

    const kind = param.identity === 'unknown'
        ? ElementKind.enum
        : ElementKind.instanceVariable;

    const copy = param.copyWith({
        jsonKey: properties.jsonKey,
        isEnum: kind === ElementKind.enum,
        enums: properties.enums,
    });

    const fieldElement: FieldElement = {
        name: param.name,
        isConst: false,
        isPrivate: isPrivate(properties.value),
        kind: kind,
        element: {
            name: param.name,
            displayName: properties.value,
            parameters: parameters.replaceWith(copy),
        }
    };

    return fieldElement;
}

function createMultipleValueFieldElements(properties: FieldBuilderProperties): FieldElement[] {
    const result: FieldElement[] = [];
    const values = getMultipleValuesFromLine(properties.value);

    for (const value of values) {
        const s = value.split(' ');
        const i = s.indexOf('=');
        const name = i !== -1 ? s[i - 1] : s.pop() ?? '';

        const fieldElement: FieldElement = {
            name: name,
            isConst: false,
            isPrivate: isPrivate(value),
            kind: ElementKind.instanceVariable,
            element: {
                name: name,
                displayName: value,
                parameters: ParametersTemplate.from(`(${value})`),
            }
        };

        result.push(fieldElement);
    }

    return result;
}

function createGetterFieldElement(properties: FieldBuilderProperties): FieldElement | undefined {
    const value = properties.value.replace('get ', '');
    const name = properties.value.split(' ').removeLast() ?? '';
    const parameters = ParametersTemplate.from(`(${value})`);
    const param = parameters.all.at(0);

    if (!param) return;

    const copy = param.copyWith({
        jsonKey: properties.jsonKey,
        isEnum: properties.isEnum,
        enums: properties.enums,
    });

    const fieldElement: FieldElement = {
        name: name,
        isConst: false,
        isPrivate: isPrivate(properties.field),
        kind: ElementKind.getter,
        element: {
            name: name,
            displayName: properties.field,
            parameters: parameters.replaceWith(copy),
        }
    };

    return fieldElement;
}

function createFuncFieldElement(properties: FieldBuilderProperties): FieldElement | undefined {
    const match = regexp.functionType.exec(properties.value);
    const parameters = ParametersTemplate.from(`(${match?.[0].trim() ?? ''})`);
    const param = parameters.all.at(0);

    if (!param) return;

    const copy = param.copyWith({
        jsonKey: properties.jsonKey,
        isEnum: properties.isEnum,
        enums: properties.enums,
    });

    const fieldElement: FieldElement = {
        name: param.name,
        isConst: false,
        isPrivate: isPrivate(properties.value),
        kind: ElementKind.instanceVariable,
        element: {
            name: param.name,
            displayName: properties.value,
            parameters: parameters.replaceWith(copy),
        }
    };

    return fieldElement;
}

function createCommentedEnumFieldElement(properties: FieldBuilderProperties): FieldElement {
    const match = properties.field.replace(regexp.enumComment, '');
    const name = match.split(' ').pop() ?? '';

    const fieldElement: FieldElement = {
        name: name,
        isConst: false,
        isPrivate: isPrivate(properties.field),
        kind: ElementKind.enum,
        element: {
            name: name,
            displayName: match,
            parameters: ParametersTemplate.from(`(${match})`).asEnum(),
        }
    };

    return fieldElement;
}