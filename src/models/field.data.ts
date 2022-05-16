import { Element, ElementKind, FieldElement } from '../interface/element';
import regexp from '../utils/regexp';

export class FieldData implements FieldElement {
    readonly name?: string;
    readonly doc?: string;
    readonly kind: ElementKind = ElementKind.undefined;
    readonly element: Element = {} as Element;

    constructor(private readonly field: string, name?: string) {
        this.name = name;
    }

    get isConst(): boolean {
        return isConst(this.field);
    }

    get isPrivate(): boolean {
        return isPrivate(this.field);
    }

    get isFactory(): boolean {
        return isFactory(this.field);
    }
}

export function isPrivate(input: string): boolean {
    return regexp.privacyMatch.test(input);
}

/** Checks if matches the factory constructor. */
export function isFactory(input: string): boolean {
    return input.includes('factory ');
}

export function isConst(input: string): boolean {
    return input.includes('const ');
}