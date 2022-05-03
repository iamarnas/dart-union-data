import { regexp } from '../utils/regexp';
import Argument from './argument';
import ClassData from './class.data';
import { ConstructorElement, ConstructorTypes } from './element';
import { isConst, isFactory, isPrivate } from './field-data';

export class ConstructorData implements ConstructorElement {
    type: ConstructorTypes = ConstructorTypes.default;
    name: string = '';
    displayName: string = '';
    parameters: Argument[] = [];

    constructor(private readonly element: ClassData, private readonly field: string) {
        this.type = getConstructorType(field);
        this.name = getConstructorName(element.name, field);
        this.parameters = Argument.fromString(field);
    }

    get isConst(): boolean {
        return isConst(this.field);
    }

    get isPrivate(): boolean {
        return isPrivate(this.field);
    }

    /** Global generic type for all subclasses without extendable types. */
    get genericType(): string {
        const types = this.element.generic?.types;
        if (!types) return '';
        const generic = types.map((e) => e.type).join(', ');
        return `<${generic}>`;
    }

    /** 
     * Subclass name. Returns with global generic type if available.
     * Otherwise returns an empty string on non-matching.
     */
    get subclass(): string {
        const subclass = getSubclass(this.field);
        if (!subclass) return '';
        return subclass;
    }

    get subclassWithGeneric(): string {
        return this.subclass + this.genericType;
    }

    toStringMethod(): string {
        const _params = this.parameters.map((e) => `${e.name}: $${e.name}`).join(', ');
        return `String toString() => '${this.subclass}(${_params})';`;
    }
}

export function isNamedConstructor(input: string): boolean {
    return regexp.namedConstructorNameMatch.test(input);
}

function getNamedConstructorName(input: string): string {
    if (!isNamedConstructor(input)) return '';
    return regexp.namedConstructorNameMatch.exec(input)![2];
}

function getConstructorType(input: string): ConstructorTypes {
    if (!isFactory(input) && isNamedConstructor(input)) {
        return ConstructorTypes.named;
    } else if (isFactory(input)) {
        return ConstructorTypes.factory;
    } else {
        return ConstructorTypes.default;
    }
}

function getConstructorName(className: string, field: string): string {
    if (field.includes(className) && isNamedConstructor(field)) {
        return getNamedConstructorName(field);
    } else if (isFactory(field) && isNamedConstructor(field)) {
        return getNamedConstructorName(field);
    } else {
        return className; // Returns as default name.
    }
}

function getSubclass(input: string): string | undefined {
    if (isFactory(input) && regexp.subclassMatch.test(input)) {
        return regexp.subclassMatch.exec(input)![2];
    }
}