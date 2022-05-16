import {
    ClassDeclarations,
    ClassElement,
    ConstructorTypes,
    ElementKind,
    FieldElement,
    GenericType,
    GenericTypeElement
} from '../interface/element';
import { hasConstructor } from '../shared/argument-extractor';
import regexp from '../utils/regexp';
import { trim } from '../utils/string-apis';
import { ConstructorData } from './constructor.data';

export class ClassData implements ClassElement {
    readonly name: string = '';
    readonly displayName: string = '';
    readonly doc?: string;
    readonly generic?: GenericTypeElement;
    readonly kind: ElementKind = ElementKind.class;
    readonly constructors: ConstructorData[] = [];
    readonly fields: FieldElement[] = [];
    /** Enum members for faster access. */
    readonly enumMembers: string[] = [];

    constructor(private readonly field: string) {
        // Start index, suitable for class and enum.
        const start = field.indexOf('class') + 5;

        if (this.isAbstract || this.startsWithClass) {
            const displayName = field.slice(start).trim();
            this.displayName = getDisplayName(displayName);
            this.name = getWithoutGenericType(displayName);
            this.generic = getGenericsElement(displayName);
        }

        if (this.isEnum) {
            // Enum value name and values, merged into one line on index 0.
            // To split them use '+' separator.
            // The split returns `["enum EnumName", "value1, value2, value3"]`.
            const split = this.field.split('+');
            const displayName = split[0].slice(start).trim();
            const members = split[1];
            this.displayName = getDisplayName(displayName);
            this.name = getWithoutGenericType(displayName);
            this.kind = ElementKind.enum;
            this.enumMembers = getEnumMembers(members);
        }
    }

    /** The all available `factory` constructors. */
    get factories(): ConstructorData[] {
        return this.constructors.filter((e) => e.type === ConstructorTypes.factory);
    }

    get hasDefaultConstructor(): boolean {
        return this.constructors.some((e) => e.type === ConstructorTypes.default);
    }

    get isAbstract(): boolean {
        return regexp.abstractClassMatch.test(this.field);
    }

    get isEnum(): boolean {
        return this.field.trimStart().startsWith('enum ');
    }

    get isEnhancedEnum(): boolean {
        if (!this.enumMembers.length) return false;
        return this.enumMembers.every(hasConstructor);
    }

    private get startsWithClass(): boolean {
        return this.field.trimStart().startsWith('class ');
    }

    get declaration(): ClassDeclarations {
        if (this.isAbstract) {
            return ClassDeclarations.abstract;
        } else if (this.isEnhancedEnum) {
            return ClassDeclarations.enhancedEnum;
        } else {
            return ClassDeclarations.class;
        }
    }

    /** 
     * The global generic type is used for interface types.
     * @example
     * ```dart
     * // Instead:
     * <T extends Object?>
     * // Returns:
     * <T>
     * ```
     */
    get genericType(): string {
        const types = this.generic?.types;
        if (!types) return '';
        const generic = types.map((e) => e.type).join(', ');
        return `<${generic}>`;
    }

    /** The element type.
     * @example
     * ```dart
     * Result<T>
     * ```
     */
    get displayType(): string {
        return this.name + this.genericType;
    }

    addField(field: FieldElement) {
        this.fields.push(field);
    }

    addConstructor(constructor: ConstructorData) {
        this.constructors.push(constructor);
    }
}

/** Creates [GenericTypeElement] from the given string. */
function getGenericsElement(input: string): GenericTypeElement | undefined {
    if (!hasGenericType(input)) return;
    return {
        types: getGenericTypes(input),
        displayName: getGenericType(input),
    };
}

function hasGenericType(input: string): boolean {
    return regexp.genericsMatch.test(input);
}

/** Returns only the class name. Can be with original generic type. */
function getDisplayName(input: string): string {
    const match = /implements|with|mixin|extends/g;
    if (!match.test(input)) return input;
    return input.replace(match, '%').split('%')[0].trim();
}

/** Removes generics type from the given string. */
export function getWithoutGenericType(input: string): string {
    const name = getDisplayName(input);
    if (!hasGenericType(name)) return name;
    return name.replace(regexp.genericsMatch, '');
}

/**
 * Extracts generic type from the given string.
 * @param input the given stringthe given string to process.
 * @param option allows extracting generic type instance without angle brackets if the `group` is `true`.
 * @returns a string.
 */
export function getGenericType(input: string, option?: { group: boolean }): string {
    if (!hasGenericType(input)) return input;
    if (option?.group) return regexp.genericsMatch.exec(input)![1].trim();
    return regexp.genericsMatch.exec(input)![0].trim();
}

/** Converts generic type from the given string into an object. */
function getGenericTypes(input: string): GenericType[] {
    if (!hasGenericType(input)) return [];
    const generics = getGenericType(input, { group: true });
    const split = generics.split(',').map(trim);
    return split.map((element) => {
        const extendable = element.includes('extends');

        if (extendable) {
            const type = element.split('extends')[0].trim();
            const extendableType = element.split('extends')[1].trim();
            return {
                type: type,
                extendableType: extendableType,
            };
        }

        return { type: element };
    });
}

/** Extracts enum members from the given string. */
function getEnumMembers(values?: string): string[] {
    if (!values) return [];
    return values.split(',').map(trim).filter(Boolean);
}
