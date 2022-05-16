import { ArgumentElement } from '../interface/element';

export default class Argument implements ArgumentElement {
    name: string = '';
    type: string = '';
    value: string = '';
    isFinal: boolean = false;
    isNullable: boolean = false;
    isRequired: boolean = false;
    isNamed: boolean = false;
    isOptional: boolean = false;
    isPositional: boolean = false;
    defaultValue: string = '';

    constructor(element?: Partial<ArgumentElement>) {
        this.name = element?.name ?? this.name;
        this.type = element?.type ?? this.type;
        this.value = element?.value ?? this.value;
        this.isFinal = element?.isFinal ?? this.isFinal;
        this.isNullable = element?.isNullable ?? this.isNullable;
        this.isRequired = element?.isRequired ?? this.isRequired;
        this.isNamed = element?.isNamed ?? this.isNamed;
        this.isOptional = element?.isOptional ?? this.isOptional;
        this.isPositional = element?.isPositional ?? this.isPositional;
        this.defaultValue = element?.defaultValue ?? this.defaultValue;
    }

    /** 
     * Immutatable value.
     * @example
     * ```dart
     * // Format.
     * final String name
     * ```
     */
    get finalVariable(): string {
        const isNull = !this.isRequired && this.isOptional && !this.isNullable ? '?' : '';
        return `final ${this.type}${isNull} ${this.name}`;
    }

    get typeAndName(): string {
        return `${this.type} ${this.name}`;
    }
}
