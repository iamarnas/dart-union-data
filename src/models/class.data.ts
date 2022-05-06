import { regexp } from '../utils/regexp';
import { trim } from '../utils/string-apis';
import { hasParams } from './argument';
import { ConstructorData } from './constructor.data';
import {
    ClassElement,
    GenericTypeElement,
    ElementKind,
    FieldElement,
    ConstructorTypes,
    ClassDeclarations,
    GenericType,
} from '../element/element';

export default class ClassData implements ClassElement {
    readonly name: string = '';
    readonly displayName: string = '';
    readonly documentationComment?: string;
    readonly generic?: GenericTypeElement;
    readonly kind: ElementKind = ElementKind.class;
    readonly constructors: ConstructorData[] = [];
    readonly fields: FieldElement[] = [];
    /** Enum values for faster access. */
    readonly enumValues: string[] = [];

    constructor(private readonly field: string) {
        // Start index, suitable for class and enum.
        const start = field.indexOf('class') + 5;

        if (this.isAbstract || this.startsWithClass) {
            const displayName = field.slice(start).trim();
            this.displayName = displayName;
            this.name = getWithoutGenericType(displayName);
            this.generic = getGenericsElement(displayName);
        }

        if (this.isEnum) {
            // Enum value name and values, merged into one line on index 0.
            // To split them use '+' separator.
            // The split returns `["enum EnumName", "value1, value2, value3"]`.
            const split = this.field.split('+');
            const displayName = split[0].slice(start).trim();
            const values = split[1];
            this.displayName = displayName;
            this.name = getWithoutGenericType(displayName);
            this.kind = ElementKind.enum;
            this.enumValues = getEnumValues(values);
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
        if (!this.enumValues.length) return false;
        return this.enumValues.every(hasParams);
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
     * Global generic type for all subclasses without extendable types.
     * Uses for types.
     * @example
     * ```dart
     * // Instead:
     * <T extends Object?>;
     * // Returns:
     * <T>;
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
     * Result<T> result;
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

function getGenericsElement(input: string): GenericTypeElement | undefined {
    if (!hasGenericType(input)) return;

    return {
        types: getGenericTypes(input),
        displayName: getGenericType(input),
    } as GenericTypeElement;
}

function hasGenericType(input: string): boolean {
    return regexp.genericsMatch.test(input);
}

export function getWithoutGenericType(input: string): string {
    if (!hasGenericType(input)) return input;
    return input.replace(regexp.genericsMatch, '');
}

export function getGenericType(input: string, option?: { group: boolean }): string {
    if (!hasGenericType(input)) return input;
    if (option?.group) return regexp.genericsMatch.exec(input)![1].trim();
    return regexp.genericsMatch.exec(input)![0].trim();
}

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
            } as GenericType;
        }

        return { type: element } as GenericType;
    });
}

function getEnumValues(values?: string): string[] {
    if (!values) return [];
    return values.split(',').map(trim).filter(Boolean);
}
