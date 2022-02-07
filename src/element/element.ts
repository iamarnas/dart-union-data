export interface ClassElement {
    name: string,
    documentationComment?: string,
    isEnum: boolean,
    isAbstract: boolean,
    genericType?: string,
    fields: FieldElement[],
    constructors: ConstructorElement[],
}

export interface Element {
    name: string,
    displayName: string,
    documentationComment?: string,
    genericType?: string,
}

export interface FieldElement {
    name?: string,
    displayName: string,
    isFinal: boolean,
    isStatic: boolean;
    element: Element;
    parameter: ParameterElement,
    constructor: ConstructorElement;
}

export interface ConstructorElement {
    name: string,
    factoryName?: string,
    isConst: boolean,
    isPrivate: boolean,
    isFactory: boolean,
    parameters: ParameterElement[],
}

export interface ParameterElement {
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