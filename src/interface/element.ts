import { ParametersTemplate } from '../templates/parameter.template';

export enum ClassDeclarations { class, abstract, enhancedEnum }
export enum ConstructorTypes { generative, factory, factoryUnnamed, named }
export enum ElementKind { undefined, class, enum, constructor, getter, instanceVariable }

/**
 * All types supported.
 */
export const typeIdentities = [
    'int',
    'double',
    'num',
    'String',
    'bool',
    'dynamic',
    'Object',
    'DateTime',
    'Map',
    'Set',
    'enum',
    'BigInt',
    'Uri',
    'unknown',
    'UnmodifiableListView',
    'UnmodifiableSetView',
    'UnmodifiableMapView',
] as const;

export type TypeIdentity = typeof typeIdentities[number];

export interface ClassElement {
    name: string,
    displayName: string,
    doc?: string,
    kind: ElementKind,
    declaration: ClassDeclarations,
    generic: GenericTypeElement,
    constructors: ConstructorElement[],
    fields: FieldElement[],
}

export interface FieldElement {
    name?: string,
    doc?: string,
    isConst: boolean,
    isPrivate: boolean,
    kind: ElementKind,
    element: Element;
}

export interface Element {
    name: string,
    displayName: string,
    parameters: ParametersTemplate,
}

export interface ConstructorElement extends Element {
    type: ConstructorTypes,
    subclassName?: string,
}

export interface ParameterElement {
    name: string,
    type: string,
    value?: string,
    defaultValue?: string,
    jsonKey: string,
    isFinal: boolean,
    isNullable: boolean,
    isRequired: boolean,
    isNamed: boolean,
    isPositional: boolean,
    isOptional: boolean,
    isSuper: boolean,
    isGetter: boolean,
    isEnum: boolean,
    isInitialized: boolean,
    isPrimitive: boolean,
    enums: string[],
    identity: TypeIdentity,
}

export interface GenericTypeElement {
    types: GenericType[],
    /** Represents full generic type. */
    displayType: string,
}

export interface GenericType {
    type: string,
    extendableType?: string,
}