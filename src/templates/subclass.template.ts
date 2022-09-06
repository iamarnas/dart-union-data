import { ClassDataTemplate, GenericTypeTemplate, ParametersTemplate } from '.';
import { ConstructorElement, ConstructorTypes } from '../interface';
import { Settings } from '../models/settings';
import '../types/string';

export class SubclassTemplate implements ConstructorElement {
    type: ConstructorTypes = ConstructorTypes.generative;
    superName = '';
    displayName = '';
    parameters: ParametersTemplate;
    settings: Settings;
    generic: GenericTypeTemplate;

    constructor(
        readonly superclass: ClassDataTemplate,
        readonly source: string,
    ) {
        this.type = ConstructorElement.type(source);
        this.displayName = ConstructorElement.displayName(source);
        this.superName = ConstructorElement.name(superclass.name, this.displayName);
        this.parameters = ConstructorElement.parameters(this.displayName)
            .included(...superclass.instances.all)
            .included(...superclass.getters.all);
        this.settings = superclass.settings;
        this.generic = superclass.generic;
    }

    get isConst(): boolean {
        return ConstructorElement.isConst(this.source);
    }

    get isPrivate(): boolean {
        return ConstructorElement.isPrivate(this.source);
    }

    get name(): string {
        const subclass = ConstructorElement.subclassName(this.source);
        if (!subclass) return '';
        return subclass;
    }

    /**
     * A class data type without extendable types.
     * @example Result<T, E>
     */
    get typeInterface(): string {
        return this.name + this.superclass.generic.type;
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