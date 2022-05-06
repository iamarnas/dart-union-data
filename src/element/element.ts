
export enum ClassDeclarations { class, abstract, enhancedEnum }
export enum ConstructorTypes { default, factory, named }
export enum ElementKind { undefined, class, enum, constructor, getter, setter, primitive }

export interface ClassElement {
    name: string,
    displayName: string,
    documentationComment?: string,
    kind: ElementKind,
    declaration: ClassDeclarations,
    generic?: GenericTypeElement,
    constructors: ConstructorElement[],
    fields: FieldElement[],
}

export interface FieldElement {
    name?: string,
    documentationComment?: string,
    isConst: boolean,
    isPrivate: boolean,
    kind: ElementKind,
    element: Element;
}

export interface Element {
    name: string,
    displayName: string,
    parameters: ParameterElement[],
}

export interface ConstructorElement extends Element {
    type: ConstructorTypes,
    subclass?: string,
}

export interface ParameterElement {
    name: string,
    type: string,
    value?: string,
    isNullable: boolean,
    isRequired: boolean,
    isNamed: boolean,
    isPositional: boolean,
    isOptional: boolean,
    defaultValue?: string,
}

export interface GenericTypeElement {
    types: GenericType[],
    displayName: string,
}

export type GenericType = {
    type: string,
    extendableType?: string,
};