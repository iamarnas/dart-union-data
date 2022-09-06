import { ParametersTemplate } from '../templates/parameter.template';
import { regexp } from '../utils';

export enum ClassDeclarations { class, abstract, enhancedEnum }
export enum ConstructorTypes { generative, factory, factoryUnnamed, named }
export enum ElementKind { undefined, class, enum, constructor, getter, instanceVariable }

/**
 * All types supported.
 */
export const typeIdentities = [
    'int',
    'double',
    'num',
    'String',
    'bool',
    'dynamic',
    'Object',
    'DateTime',
    'Map',
    'Set',
    'enum',
    'BigInt',
    'Uri',
    'unknown',
    'UnmodifiableListView',
    'UnmodifiableSetView',
    'UnmodifiableMapView',
] as const;

export type TypeIdentity = typeof typeIdentities[number];

export interface ClassElement {
    name: string,
    displayName: string,
    doc?: string,
    kind: ElementKind,
    declaration: ClassDeclarations,
    generic: GenericTypeElement,
    constructors: ConstructorElement[],
    fields: FieldElement[],
}

export interface FieldElement {
    name?: string,
    doc?: string,
    isConst: boolean,
    isPrivate: boolean,
    kind: ElementKind,
    element: Element;
}

export interface Element {
    name: string,
    displayName: string,
    parameters: ParametersTemplate,
}

export interface ConstructorElement extends Element {
    type: ConstructorTypes,
    subclassName?: string,
}

export interface ParameterElement {
    name: string,
    type: string,
    value?: string,
    defaultValue?: string,
    jsonKey: string,
    isFinal: boolean,
    isNullable: boolean,
    isRequired: boolean,
    isNamed: boolean,
    isPositional: boolean,
    isOptional: boolean,
    isSuper: boolean,
    isGetter: boolean,
    isEnum: boolean,
    isInitialized: boolean,
    isPrimitive: boolean,
    enums: string[],
    identity: TypeIdentity,
}

export interface GenericTypeElement {
    types: GenericType[],
    /** Represents full generic type. */
    displayType: string,
}

export interface GenericType {
    type: string,
    extendableType?: string,
}

export namespace GenericType {
    /**
     * Function to check whether the text has generic types.
     * @param input The text that contains objects with generic types.
     * @returns a boolean.
     */
    export function isGeneric(input: string): boolean {
        return regexp.genericType.test(input);
    }

    /**
     * Extracts generic type from the given string.
     * @param input the string that contains the generic type.
     * @param option allows extracting generic type instance without angle brackets if the `group` is `true`.
     * @returns generic type as a string. Otherwise, if not found, an empty string is returned.
     */
    export function displayType(input: string, option?: { group: boolean }): string {
        if (!isGeneric(input)) return '';
        const start = input.indexOf('<') + (option?.group ? 1 : 0);
        const end = input.indexOf('> ') !== -1
            ? input.indexOf('> ') + (option?.group ? 0 : 2)
            : input.lastIndexOf('>') + (option?.group ? 0 : 1);
        const genericType = input.slice(start, end).trim();
        const formatted = format(genericType);
        return formatted;
    }

    /**
     * A function that will correct syntaxes such as spaces and commas.
     * @param input A text that contains an object name with a generic type.
     * @returns given string with formatted syntax.
     */
    export function format(input: string): string {
        const isBadFormatted = /\s{2,}|,\S|<\s+|\s+>/g;
        if (!isBadFormatted) return input;
        return input.replace(/\s{2,}/g, ' ')
            .replace(/,\s*/g, ', ')
            .replace(/\s+,/g, ',')
            .replace(/<\s+/g, '<')
            .replace(/\s+>/g, '>');
    }

    /**
     * Converts generic type from the given string into an object.
     * @param input A text that contains an object name with a generic type.
     * @returns A list [GenericType], because the value can have a few generic types.
     */
    export function types(input: string): GenericType[] {
        const genericTypes: GenericType[] = [];
        if (!isGeneric(input)) return genericTypes;
        const generics = displayType(input, { group: true });
        const split = generics.split(',').map((e) => e.trim());

        for (const element of split) {
            const extendable = element.includes('extends');

            if (extendable) {
                const type = element.split('extends')[0].trim();
                const extendableType = element.split('extends')[1].trim();
                genericTypes.push({ type: type, extendableType: extendableType });
                continue;
            }

            genericTypes.push({ type: element });
        }

        return genericTypes;
    }
}

export namespace ConstructorElement {
    export function isNamed(input: string): boolean {
        return regexp.namedConstructorName.test(input);
    }

    export function namedConstructorName(input: string): string {
        return regexp.namedConstructorName.exec(input)?.[2] ?? '';
    }

    export function type(input: string): ConstructorTypes {
        const fitered = input.replace(/(\s+:.*)|(\s+{.*)/, '');

        if (!isFactory(fitered) && isNamed(fitered)) {
            return ConstructorTypes.named;
        } else if (isFactory(fitered) && !isNamed(fitered)) {
            return ConstructorTypes.factoryUnnamed;
        } else if (isFactory(fitered)) {
            return ConstructorTypes.factory;
        } else {
            return ConstructorTypes.generative;
        }
    }

    export function name(className: string, field: string): string {
        if (field.includes(className) && isNamed(field)) {
            return namedConstructorName(field);
        } else if (isFactory(field) && isNamed(field)) {
            return namedConstructorName(field);
        } else {
            return className; // Returns as default name.
        }
    }

    export function subclassName(input: string): string | undefined {
        if (isFactory(input) && regexp.subclassMatch.test(input)) {
            return regexp.subclassMatch.exec(input)?.[1];
        }
    }

    export function displayName(input: string): string {
        const start = input.indexOf('._') !== -1
            ? input.indexOf('._')
            : input.indexOf('(');
        const end = input.indexOf(')') + 1;
        if (start === -1) return '';
        return input.slice(start, end);
    }

    export function isPrivate(input: string): boolean {
        return regexp.privacy.test(input);
    }

    /** Checks if matches the factory constructor. */
    export function isFactory(input: string): boolean {
        return input.includes('factory ');
    }

    export function isConst(input: string): boolean {
        return input.includes('const ');
    }

    /**
     * Converts constructors parameters from given string.
     * - **Note:** `input` must contain a constructor (...) to determine parameters range.
     * @param input the string that contains the constructor.
     * @returns A ParametersTemplate
     */
    export function parameters(input: string): ParametersTemplate {
        return ParametersTemplate.from(input);
    }
}