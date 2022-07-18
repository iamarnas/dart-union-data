import { DartParameterCodec, ParameterExpression } from '../codecs/dart-parameter-codec';
import { ParameterElement, typeIdentities, TypeIdentity } from '../interface/element';

const nullablePrimitiveTypes = ['int?', 'double?', 'num?', 'String?', 'bool?', 'dynamic?', 'Object?'] as const;
export const primitiveTypes = ['int', 'double', 'num', 'String', 'bool', 'dynamic', 'Object', ...nullablePrimitiveTypes] as const;

export type PrimitiveType = typeof primitiveTypes[number];

export class Parameter implements ParameterElement {
    readonly name: string = '';
    readonly type: string = '';
    readonly value: string = '';
    readonly defaultValue: string = '';
    readonly jsonKey: string = '';
    readonly isFinal: boolean = false;
    readonly isNullable: boolean = false;
    readonly isRequired: boolean = false;
    readonly isNamed: boolean = false;
    readonly isOptional: boolean = false;
    readonly isPositional: boolean = false;
    readonly isSuper: boolean = false;
    readonly isGetter: boolean = false;
    readonly isEnum: boolean = false;
    /**
     * Specifies whether the value is initialized in the constructor.
     */
    readonly isInitialized: boolean = false;
    /**
     * A holder for enum types. There can be several types example generic type for map.
     */
    readonly enums: string[] = [];

    constructor(parameter?: Partial<ParameterElement>) {
        Object.assign(this, parameter);
    }

    get hasDefault(): boolean {
        return this.defaultValue.length !== 0;
    }

    get hasEnums(): boolean {
        return this.enums.length !== 0;
    }

    /**
     * The map key is used to define the value from the map. 
     * If {@link jsonKey} is not empty returns JSON key otherwise value name.
     */
    get mapKey(): string {
        return Boolean(this.jsonKey) ? this.jsonKey : this.name;
    }

    /** 
     * A type name without null check `?`.
     */
    get typeName(): string {
        return this.type.endsWith('?') ? this.type.slice(0, -1) : this.type;
    }

    get identity(): TypeIdentity {
        return getTypeIdentify(this.type, this.isEnum);
    }

    get isPrimitive(): boolean {
        return isPrimitive(this.type);
    }

    get isDateTime(): boolean {
        return getAbsoluteType(this.type).includes('DateTime');
    }

    get isList(): boolean {
        return this.type.startsWith('List');
    }

    get isMap(): boolean {
        return getAbsoluteType(this.type).startsWith('Map');
    }

    get isSet(): boolean {
        return getAbsoluteType(this.type).startsWith('Set');
    }

    get isExplicitlyNullable(): boolean {
        return !this.isRequired && this.isOptional && !this.isNullable && !this.hasDefault;
    }

    copyWith(parameter?: Partial<ParameterElement>): Parameter {
        Object.assign(this, parameter);
        return this;
    }

    /**
     * @param expression a method parameter expression.
     * @returns parameter as string.
     */
    expression(expression: ParameterExpression = 'instance-variable'): string {
        const codec = new DartParameterCodec();
        return codec.decode(this, expression);
    }
}

export function getTypeIdentify(type: string, isEnum = false): TypeIdentity {
    const elementType = type.startsWith('List') ? getAbsoluteType(type) : type;

    if (isEnum) return 'enum';

    for (const identity of typeIdentities) {
        if (elementType.slice(0, identity.length) === identity) {
            return identity;
        }
    }

    return 'unknown';
}

export function isPrimitive(type: string): boolean {
    const elemntType = getAbsoluteType(type);
    return primitiveTypes.some((e) => e.startsWith(elemntType));
}

/**
 * Returns element type from the List and Set. Otherwise, return the current type.
 * @param type initial element type.
 * @returns element type as `string`.
 */
export function getAbsoluteType(type: string): string {
    if (type.startsWith('Set')) {
        const len = type.split('<').filter((e) => e === 'Set').length;
        const start = type.lastIndexOf('Set<') + 4;
        const end = type.lastIndexOf('>') + 1 - len;
        const setType = type.slice(start, end);
        return len !== 0 && Boolean(setType) ? setType : type;
    }

    const len = type.split('<').filter((e) => e === 'List').length;
    const start = type.lastIndexOf('List<') + 5;
    const end = type.lastIndexOf('>') + 1 - len;
    const listType = type.slice(start, end);
    return len !== 0 && Boolean(listType) ? listType : type;
}
