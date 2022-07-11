import { ConstructorTemplate, GenericTypeTemplate, hasConstructor } from '.';
import {
    ClassDeclarations,
    ClassElement,
    ConstructorTypes,
    ElementKind,
    FieldElement
} from '../interface';
import { Parameter } from '../models/parameter';
import { Settings } from '../models/settings';
import '../types/array';
import '../types/string';
import { regexp, trim } from '../utils';
import { ParametersTemplate } from './parameter.template';

export class ClassDataTemplate implements ClassElement {
    readonly name: string = '';
    readonly displayName: string = '';
    readonly doc?: string;
    readonly generic: GenericTypeTemplate;
    readonly kind: ElementKind = ElementKind.class;
    readonly constructors: ConstructorTemplate[] = [];
    readonly fields: FieldElement[] = [];
    /** Enum members for faster access. */
    readonly enumMembers: string[] = [];

    constructor(readonly source: string, readonly settings: Settings) {
        this.generic = new GenericTypeTemplate(source);
        // Start index, suitable for class and enum.
        const start = source.indexOf('class') + 5;

        if (this.isAbstract || this.source.trimStart().startsWith('class ')) {
            const displayName = source.slice(start).trim();
            this.name = getClassName(displayName).capitalize();
            this.displayName = this.name + this.generic.displayType;
        }

        if (this.isEnum) {
            // Enum value name and values, merged into one line on index 0.
            // To split them use '+' separator.
            // The split returns two elements `["enum EnumName", "value1, value2, value3"]`.
            const split = this.source.split('+');
            const name = split[0].slice(start).trim();
            const members = split[1];
            this.name = name.capitalize();
            this.displayName = this.name;
            this.kind = ElementKind.enum;
            this.enumMembers = getEnumMembers(members);
        }
    }

    /** The all available `factory` constructors. */
    get factories(): ConstructorTemplate[] {
        return this.constructors.filter((e) => e.type === ConstructorTypes.factory);
    }

    /**
     * The all getters instance variables.
     */
    get getters(): ParametersTemplate {
        const params = this.fields
            .filter((e) => e.kind === ElementKind.getter)
            .map((e) => e.element.displayName.replace('get ', ''));
        return ParametersTemplate.from(`(${params.join(', ')})`).asGetters();
    }

    /**
     * The class instance variables without a parameters type.
     * To get full variables details use {@link instanceVariables}.
     */
    private get variables(): ParametersTemplate {
        const parameters = ParametersTemplate.from('');
        const params = this.fields
            .filter((e) => e.kind === ElementKind.instanceVariable || e.kind === ElementKind.enum)
            .map((e) => e.element.parameters.asSuper().all[0]);
        parameters.set(...params);
        return parameters;
    }

    /** 
     * Get generative constructor formal parameters. 
     * A term of the form `this.id` can provide value without type
     * but provide parameters types and default values.
     */
    private get formalPrameters(): ParametersTemplate {
        if (!this.generativeConstructor) return ParametersTemplate.from('');
        const source = this.generativeConstructor.displayName;
        return ParametersTemplate.from(source).initialize();
    }

    /**
     * The class instance variables with parameters type
     * are based on constructor's {@link formalParameters}.
     */
    get instanceVariables(): ParametersTemplate {
        const parameters: Parameter[] = [];
        const formalPrameters = this.formalPrameters;
        // Instance variables with unknown initiated param type.
        const instanceVariables = this.variables;
        if (formalPrameters.isEmpty) return instanceVariables;
        // Combine the missing details from the formal parameters.
        const merged = instanceVariables.included(...formalPrameters.all);

        // Sort by constructor parameters, it is important for other constructors.
        for (const variable of merged.all) {
            if (formalPrameters.has(variable.name)) {
                parameters.push(variable);
            };
        }

        for (const variable of merged.all) {
            if (!formalPrameters.has(variable.name)) {
                parameters.push(variable);
            };
        }

        // Update the buffer so that it matches the super constructor order.
        return instanceVariables.replaceWith(...parameters);
    }

    get generativeConstructor(): ConstructorTemplate | undefined {
        return this.constructors.filter((e) => e.type === ConstructorTypes.generative)[0];
    }

    get hasGenerativeConstructor(): boolean {
        return this.generativeConstructor !== undefined;
    }

    get hasPrivateConstructor(): boolean {
        if (!this.generativeConstructor) return false;
        const constructor = this.generativeConstructor;
        return regexp.privacy.test(constructor.displayName);
    }

    get hasData(): boolean {
        return this.instanceVariables.isNotEmpty || this.factories.isNotEmpty();
    }

    get isAbstract(): boolean {
        return regexp.abstractClass.test(this.source);
    }

    get isEnum(): boolean {
        return this.source.trimStart().startsWith('enum ');
    }

    get isEnhancedEnum(): boolean {
        if (!this.enumMembers.length) return false;
        return this.enumMembers.every(hasConstructor);
    }

    get hasConstantGenerativeConstructor(): boolean {
        return this.generativeConstructor?.isConst ?? false;
    }

    get hasConstantFactories(): boolean {
        return this.factories.every((e) => e.isConst);
    }

    get isImmutableData(): boolean {
        const everyIsConst = this.hasConstantGenerativeConstructor || this.hasConstantFactories;
        return everyIsConst && this.hasImmutableVariables;
    }

    get hasImmutableVariables(): boolean {
        return this.instanceVariables.all.every((e) => e.isFinal);
    }

    // TODO: test variable.
    get hasImplementations(): boolean {
        return !this.isAbstract && !this.hasPrivateConstructor && !this.isImmutableData;
    }

    get declaration(): ClassDeclarations {
        if (this.isAbstract) {
            return ClassDeclarations.abstract;
        } else if (this.isEnhancedEnum) {
            return ClassDeclarations.enhancedEnum;
        } else {
            return ClassDeclarations.class;
        }
    }

    /** 
     * The element type.
     * @example 'Result<T>'
     */
    get typeInference(): string {
        return this.name + this.generic.type;
    }

    addField(field: FieldElement) {
        this.fields.push(field);
    }

    addConstructor(constructor: ConstructorTemplate) {
        this.constructors.push(constructor);
    }
}

function hasGenericType(input: string): boolean {
    return regexp.genericType.test(input);
}

/** Returns only the class name and removes the generic type if it is detected. */
function getClassName(input: string): string {
    const match = /implements|with|mixin|extends/g;
    let name = input;

    if (hasGenericType(name)) {
        name = name.replace(regexp.genericType, '');
    }

    if (match.test(name)) {
        name = name.replace(match, '%').split('%')[0].trim();
    }

    return name;
}

/** Extracts enum members from the given string. */
function getEnumMembers(values?: string): string[] {
    if (!values) return [];
    return values.split(',').map(trim).filter(Boolean);
}