import { FieldElement } from '../interface';
import { ClassDataTemplate, SubclassTemplate } from '../templates';
import { buildString, StringBuffer } from '../utils/string-buffer';

type MethodType = 'when' | 'maybeWhen' | 'whenOrNull' | 'map' | 'maybeMap' | 'mapOrNull';

export class MethodGenerator {
    private readonly fields: FieldElement[];
    private readonly factories: SubclassTemplate[];
    private readonly name: string;
    private readonly superclass: string;
    private sb: StringBuffer = new StringBuffer();
    private methodType: MethodType = 'when';

    constructor(private readonly element: ClassDataTemplate) {
        this.factories = element.factories;
        this.fields = element.fields;
        this.name = element.name;
        this.superclass = element.name.decapitalize();
    }

    static fromElement(element: ClassDataTemplate): MethodGenerator {
        return new MethodGenerator(element);
    }

    generate(methodType: MethodType): string {
        this.initialize(methodType);
        this.writeMethod();
        return this.sb.toString();
    }

    private initialize(methodType: MethodType) {
        this.sb.clean();
        this.methodType = methodType;
    }

    private writeMethod() {
        switch (this.methodType) {
            case 'when':
                this.whenFunc();
                this.whenBlock();
                break;
            case 'maybeWhen':
                this.maybeWhenFunc();
                this.maybeWhenBlock();
                break;
            case 'whenOrNull':
                this.whenOrNullFunc();
                this.whenOrNullBlock();
                break;
            case 'map':
                this.mapFunc();
                this.mapBlock();
                break;
            case 'maybeMap':
                this.maybeMapFunc();
                this.maybeMapBlock();
                break;
            case 'mapOrNull':
                this.mapOrNullFunc();
                this.mapOrNullBlock();
                break;
        }
    }

    /**
     * @requires {@link mapOrNullBlock} to get full function.
     */
    private mapOrNullFunc() {
        if (this.element.isEnum) {
            this.sb.write(
                func({
                    name: 'R? mapOrNull<R>',
                    fields: this.fields,
                    parameter: (field) => `R Function(${this.name} ${field.name})? ${field.name},`
                }),
            );
        } else {
            this.sb.write(
                func({
                    name: 'R? mapOrNull<R>',
                    fields: this.factories,
                    parameter: (field) => `R Function(${field.typeInterface} ${field.name})? ${field.name},`,
                }),
            );
        }
    }

    /**
     * @requires {@link maybeMapBlock} to get full function.
     */
    private maybeMapFunc() {
        if (this.element.isEnum) {
            this.sb.write(
                func({
                    name: 'R? maybeMap<R>',
                    fields: this.fields,
                    parameter: (field) => `R Function(${this.name} ${field.name})? ${field.name},`,
                    default: 'required R Function() orElse,'
                }),
            );
        } else {
            this.sb.write(
                func({
                    name: 'R? maybeMap<R>',
                    fields: this.factories,
                    parameter: (field) => `R Function(${field.typeInterface} ${field.name})? ${field.name},`,
                    default: 'required R Function() orElse,'
                }),
            );
        }
    }

    /**
     * @requires {@link mapBlock} to get full function.
     */
    private mapFunc() {
        if (this.element.isEnum) {
            this.sb.write(
                func({
                    name: 'R map<R>',
                    fields: this.fields,
                    parameter: (field) => `required R Function(${this.name} ${field.name}) ${field.name},`,
                }),
            );
        } else {
            this.sb.write(
                func({
                    name: 'R? map<R>',
                    fields: this.factories,
                    parameter: (field) => `required R Function(${field.typeInterface} ${field.name}) ${field.name},`,
                }),
            );
        }
    }

    /**
     * @requires {@link whenOrNullBlock} to get full function.
     */
    private whenOrNullFunc() {
        if (this.element.isEnum) {
            this.sb.write(
                func({
                    name: 'R? whenOrNull<R>',
                    fields: this.fields,
                    parameter: (field) => `R Function()? ${field.name},`,
                }),
            );
        } else {
            this.sb.write(
                func({
                    name: 'R? whenOrNull<R>',
                    fields: this.factories,
                    parameter: (field) => `R Function(${field.funcParameters})? ${field.name},`,
                }),
            );
        }
    }

    /**
     * @requires {@link maybeWhenBlock} to get full function.
     */
    private maybeWhenFunc() {
        if (this.element.isEnum) {
            this.sb.write(
                func({
                    name: 'R? maybeWhen<R>',
                    fields: this.fields,
                    parameter: (field) => `R Function()? ${field.name},`,
                    default: 'required R Function() orElse,',
                }),
            );
        } else {
            this.sb.write(
                func({
                    name: 'R? maybeWhen<R>',
                    fields: this.factories,
                    parameter: (field) => `R Function(${field.funcParameters})? ${field.name},`,
                    default: 'required R Function() orElse,',
                }),
            );
        }
    }

    /**
     * @requires {@link whenBlock} to get full function.
     */
    private whenFunc() {
        if (this.element.isEnum) {
            this.sb.write(
                func({
                    name: 'R when<R>',
                    fields: this.fields,
                    parameter: (field) => `required R Function() ${field.name},`,
                }),
            );
        } else {
            this.sb.write(
                func({
                    name: 'R when<R>',
                    fields: this.factories,
                    parameter: (field) => `required R Function(${field.funcParameters}) ${field.name},`,
                }),
            );
        }
    }

    private whenBlock() {
        this.sb.write(' {');

        if (this.element.isEnum) {
            this.sb.write(
                statement({
                    fields: this.fields,
                    statement: 'switch',
                    parameter: (field) => `${this.name}.${field.name}:`,
                    callback: (field) => `return ${field.name}();`,
                }),
            );
        } else {
            this.sb.writeln(`final ${this.superclass} = this;`, 2);
            this.sb.write(
                statement({
                    fields: this.factories,
                    statement: 'if',
                    parameter: (field) => `${this.superclass} is ${field.typeInterface}`,
                    callback: (field) => `return ${field.name}(${field.parametersFrom(this.superclass)});`,
                    default: 'throw AssertionError();',
                }),
            );
        }

        this.sb.writeln('}', 1);
    }

    private maybeWhenBlock() {
        this.sb.write(' {');

        if (this.element.isEnum) {
            this.sb.write(
                statement({
                    fields: this.fields,
                    statement: 'if',
                    parameter: (field) => `this == ${this.name}.${field.name} && ${field.name} != null`,
                    callback: (field) => `return ${field.name}();`,
                    default: 'return orElse();',
                }),
            );
        } else {
            this.sb.writeln(`final ${this.superclass} = this;`, 2);
            this.sb.write(
                statement({
                    fields: this.factories,
                    statement: 'if',
                    parameter: (field) => `${this.superclass} is ${field.typeInterface}`,
                    callback: (field) => `return ${field.name}?.call(${field.parametersFrom(this.superclass)}) ?? orElse();`,
                    default: 'throw AssertionError();',
                }),
            );
        }

        this.sb.writeln('}', 1);
    }

    private whenOrNullBlock() {
        this.sb.write(' {');

        if (this.element.isEnum) {
            this.sb.write(
                statement({
                    fields: this.fields,
                    statement: 'switch',
                    parameter: (field) => `${this.name}.${field.name}:`,
                    callback: (field) => `return ${field.name}?.call();`,
                }),
            );
        } else {
            this.sb.writeln(`final ${this.superclass} = this;`, 2);
            this.sb.write(
                statement({
                    fields: this.factories,
                    statement: 'if',
                    parameter: (field) => `${this.superclass} is ${field.typeInterface}`,
                    callback: (field) => `return ${field.name}?.call(${field.parametersFrom(this.superclass)});`,
                    default: 'throw AssertionError();',
                }),
            );
        }

        this.sb.writeln('}', 1);
    }

    private mapBlock() {
        this.sb.write(' {');

        if (this.element.isEnum) {
            this.sb.write(
                statement({
                    fields: this.fields,
                    statement: 'switch',
                    parameter: (field) => `${this.name}.${field.name}:`,
                    callback: (field) => `return ${field.name}(this);`,
                }),
            );
        } else {
            this.sb.writeln(`final ${this.superclass} = this;`, 2);
            this.sb.write(
                statement({
                    fields: this.factories,
                    statement: 'if',
                    parameter: (field) => `${this.superclass} is ${field.typeInterface}`,
                    callback: (field) => `return ${field.name}(${this.superclass});`,
                    default: 'throw AssertionError();',
                }),
            );
        }

        this.sb.writeln('}', 1);
    }

    private maybeMapBlock() {
        this.sb.write(' {');

        if (this.element.isEnum) {
            this.sb.write(
                statement({
                    fields: this.fields,
                    statement: 'if',
                    parameter: (field) => `this == ${this.name}.${field.name} && ${field.name} != null`,
                    callback: (field) => `return ${field.name}(this);`,
                    default: 'return orElse();',
                }),
            );
        } else {
            this.sb.writeln(`final ${this.superclass} = this;`, 2);
            this.sb.write(
                statement({
                    fields: this.factories,
                    statement: 'if',
                    parameter: (field) => `${this.superclass} is ${field.typeInterface}`,
                    callback: (field) => `return ${field.name}?.call(${this.superclass}) ?? orElse();`,
                    default: 'throw AssertionError();',
                }),
            );
        }

        this.sb.writeln('}', 1);
    }

    private mapOrNullBlock() {
        this.sb.write(' {');

        if (this.element.isEnum) {
            this.sb.write(
                statement({
                    fields: this.fields,
                    statement: 'switch',
                    parameter: (field) => `${this.name}.${field.name}:`,
                    callback: (field) => `return ${field.name}?.call(this);`,
                }),
            );
        } else {
            this.sb.writeln(`final ${this.superclass} = this;`, 2);
            this.sb.write(
                statement({
                    fields: this.factories,
                    statement: 'if',
                    parameter: (field) => `${this.superclass} is ${field.typeInterface}`,
                    callback: (field) => `return ${field.name}?.call(${this.superclass});`,
                    default: 'throw AssertionError();',
                }),
            );
        }

        this.sb.writeln('}', 1);
    }
}

/**
 * Returns the statement according to the specified values.
 * @param options for setup statement output expression.
 * @returns a string.
 * @example 'switch(this) {...} or if(...) {}'
 */
function statement<T>(options: {
    fields: T[],
    statement: 'if' | 'switch',
    parameter: (field: T) => string,
    callback: (field: T) => string,
    default?: string,
}): string {
    return buildString((sb) => {
        switch (options.statement) {
            case 'switch':
                sb.writeln('switch (this) {', 2);

                for (const field of options.fields) {
                    sb.writeln(`case ${options.parameter(field)}`, 3);
                    sb.writeln(`${options.callback(field)}`, 4);
                }

                if (options.default) {
                    sb.writeln('default:', 3);
                    sb.writeln(`${options.default}`, 4);
                }

                sb.writeln('}', 2);

                return sb.toString();
            case 'if':
                for (let i = 0; i < options.fields.length; i++) {
                    const field = options.fields[i];

                    if (i === 0) {
                        sb.writeln(`if (${options.parameter(field)}) {`, 2);
                        sb.writeln(`${options.callback(field)}`, 3);
                    } else {
                        sb.writeln(`} else if (${options.parameter(field)}) {`, 2);
                        sb.writeln(`${options.callback(field)}`, 3);
                    }
                }

                sb.writeln('}', 2);

                if (options.default) {
                    sb.write(' else {');
                    sb.writeln(`${options.default}`, 3);
                    sb.writeln('}', 2);
                }
        }
    });
}

/**
 * Returns function with named optional parameters without block.
 * @param options for setup function output expression.
 * @returns a string.
 * @example 'name({...})'
 */
function func<T>(options: {
    name: string,
    fields: T[],
    parameter: (field: T) => string,
    default?: string
}): string {
    return buildString((sb) => {
        sb.write(options.name, 1);
        sb.write('({');

        for (const field of options.fields) {
            sb.writeln(options.parameter(field), 2);
        }

        if (options.default) {
            sb.writeln(options.default, 2);
        }

        sb.writeln('})', 1);
    });
}