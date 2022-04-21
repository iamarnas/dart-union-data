export interface ClassElement {
    name: string,
    displayName: string,
    documentationComment?: string,
    isEnum: boolean,
    isAbstract: boolean,
    genericType?: GenericType,
    fields: FieldElement[],
    elementConstructor?: Element,
}

export interface FieldElement {
    name?: string,
    displayName?: string,
    documentationComment?: string,
    isConst: boolean,
    isConstructor: boolean,
    isPrivate: boolean,
    isFactory: boolean,
    subclassName?: string,
    element: Element;
}

export interface Element {
    name: string,
    displayName: string,
    arguments: ArgumentElement[],
}

export interface ArgumentElement {
    name: string,
    type: string,
    value?: string,
    nullable: boolean,
    isRequired: boolean,
    isNamed: boolean,
    isPositional: boolean,
    isOptional: boolean,
    defaultValue?: string,
}

export type GenericType = {
    type: string,
    displayName: string,
    extendsTo?: string,
};