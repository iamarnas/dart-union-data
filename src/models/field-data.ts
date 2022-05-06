import { regexp } from '../utils/regexp';
import { Element, ElementKind, FieldElement } from '../element/element';

export class FieldData implements FieldElement {
    readonly name?: string;
    readonly documentationComment?: string;
    readonly isConst: boolean = false;
    readonly isPrivate: boolean = false;
    readonly kind: ElementKind = ElementKind.undefined;
    readonly element: Element = {} as Element;

    constructor(private readonly field: string, name?: string) {
        this.name = name;
        this.isConst = isConst(field);
        this.isPrivate = isPrivate(field);
    }
}

export function isPrivate(input: string): boolean {
    return regexp.privacyMatch.test(input);
}

export function isFactory(input: string): boolean {
    return regexp.factoryMatch.test(input);
}

export function isConst(input: string): boolean {
    return input.includes('const ');
}