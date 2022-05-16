import { ConstructorElement, ConstructorTypes } from '../interface/element';
import { extractArguments } from '../shared/argument-extractor';
import regexp from '../utils/regexp';
import Argument from './argument';
import { ClassData } from './class.data';
import { isConst, isFactory, isPrivate } from './field.data';

export class ConstructorData implements ConstructorElement {
    type: ConstructorTypes = ConstructorTypes.default;
    name: string = '';
    displayName: string = '';

    constructor(
        private readonly element: ClassData,
        private readonly field: string,
    ) {
        this.type = getConstructorType(field);
        this.name = getConstructorName(element.name, field);
    }

    get arguments(): Argument[] {
        return extractArguments(this.field);
    }

    get isConst(): boolean {
        return isConst(this.field);
    }

    get isPrivate(): boolean {
        return isPrivate(this.field);
    }

    get genericType(): string {
        return this.element.genericType;
    }

    get subclass(): string {
        const subclass = getSubclass(this.field);
        if (!subclass) return '';
        return subclass;
    }

    get displayType(): string {
        return this.subclass + this.genericType;
    }

    get callbackParams(): string {
        return this.arguments.map((e) => `${e.type} ${e.name}`).join(', ');
    }

    /**
     * Parameters for callback methods constructor.
     * @returns a string.
     * @example
     * ```dart
     * 'subclass.name, subclass.id'
     * ```
     */
    callbackParamsFrom(subclass: string): string {
        return this.arguments.map((e) => `${subclass}.${e.name}`).join(', ');
    }

    /**
     * Parameters for `toString` method.
     * @returns a string.
     * @example
     * ```dart
     * 'Result<$T>(value: $value, error: $error)';
     * ```
     */
    get toStringValue(): string {
        const params = this.arguments.map((e) => `${e.name}: $${e.name}`).join(', ');
        const generics = this.element.generic?.types.map((e) => `\$${e.type}`);
        const generic = !generics ? '' : `<${generics.join(', ')}>`;
        return `'${this.subclass}${generic}(${params})';`;
    }

    /**
     * Parameters for the class constructor are initialized with `this`.
     * If any value is required, the `required` keyword will be added.
     * @returns a string.
     * @param {boolean} block adds required missing trailing comma.
     * @example
     * ```dart
     * // Required:
     * 'this.name, this.id'
     * // Named:
     * '{this.name, this.id}'
     * // Positional:
     * '[this.name, this.id]'
     * ```
     */
    initValues(block = false): string {
        if (!this.arguments.length) return '';
        // Required trailing comma.
        const comma = block ? ',' : '';
        const _params = this.arguments
            .filter((e) => !e.isOptional)
            .map((e) => `this.${e.name}`)
            .join(', ');
        const _named = this.arguments
            .filter((e) => e.isNamed)
            .map((e) => e.isRequired ? `required this.${e.name}` : `this.${e.name}`)
            .join(', ');
        const _positional = this.arguments
            .filter((e) => e.isPositional)
            .map((e) => `this.${e.name}`)
            .join(', ');

        const named = _named.length !== 0
            ? `{${_named}${comma}}`
            : '';
        const positional = _positional.length !== 0
            ? `[${_positional}${comma}]`
            : '';
        const params = (_named.length !== 0 || _positional.length !== 0)
            ? _params
            : `${_params}${comma}`;

        return [params, named, positional].filter(Boolean).join(', ');
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
        return regexp.subclassMatch.exec(input)![1];
    }
}