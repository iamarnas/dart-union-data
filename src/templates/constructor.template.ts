import { ClassDataTemplate, ParametersTemplate } from '.';
import { ConstructorElement, ConstructorTypes } from '../interface';
import '../types/string';
import { regexp } from '../utils';

export class ConstructorTemplate implements ConstructorElement {
    type: ConstructorTypes = ConstructorTypes.generative;
    name = '';
    displayName = '';
    parameters: ParametersTemplate;

    constructor(
        readonly superclass: ClassDataTemplate,
        readonly source: string,
    ) {
        this.type = getConstructorType(source);
        this.displayName = getConstructorDisplayName(source);
        this.name = getConstructorName(superclass.name, this.displayName);
        this.parameters = ParametersTemplate.from(this.displayName)
            .included(...superclass.instanceVariables.all)
            .included(...superclass.getters.all);
    }

    get isConst(): boolean {
        return isConst(this.source);
    }

    get isPrivate(): boolean {
        return isPrivate(this.source);
    }

    get subclassName(): string {
        const subclass = getSubclassName(this.source);
        if (!subclass) return '';
        return subclass;
    }

    /**
     * A class data type without extendable types.
     * @example Result<T, E>
     */
    get typeInference(): string {
        return this.subclassName + this.superclass.generic.type;
    }

    /**
     * @example String name, int age
     */
    get funcParameters(): string {
        return this.parameters.expressionsOf('func-params').join(', ');
    }

    /**
     * Parameters from a class instance.
     * @returns a string.
     * @example 'className.name, className.id'
     */
    parametersFrom(className: string): string {
        const name = className.decapitalize();
        return this.parameters.all.map((e) => `${name}.${e.name}`).join(', ');
    }
}

export function isNamedConstructor(input: string): boolean {
    return regexp.namedConstructorName.test(input);
}

function getNamedConstructorName(input: string): string {
    return regexp.namedConstructorName.exec(input)?.[2] ?? '';
}

function getConstructorType(input: string): ConstructorTypes {
    const fitered = input.replace(/(\s+:.*)|(\s+{.*)/, '');

    if (!isFactory(fitered) && isNamedConstructor(fitered)) {
        return ConstructorTypes.named;
    } else if (isFactory(fitered) && !isNamedConstructor(fitered)) {
        return ConstructorTypes.factoryUnnamed;
    } else if (isFactory(fitered)) {
        return ConstructorTypes.factory;
    } else {
        return ConstructorTypes.generative;
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

function getSubclassName(input: string): string | undefined {
    if (isFactory(input) && regexp.subclassMatch.test(input)) {
        return regexp.subclassMatch.exec(input)?.[1];
    }
}

function getConstructorDisplayName(input: string): string {
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