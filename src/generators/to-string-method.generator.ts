import { ClassDataTemplate, ConstructorTemplate, GenericTypeTemplate, ParametersTemplate } from '../templates';
import { StringBuffer } from '../utils/string-buffer';

export class ToStringMethodGenerator {
    private sb = new StringBuffer();
    private parameters: ParametersTemplate;
    private generic: GenericTypeTemplate;
    private className: string;
    private isOverridable = false;

    constructor(private element: ConstructorTemplate | ClassDataTemplate) {
        this.parameters = element instanceof ConstructorTemplate
            ? element.parameters
            : element.instanceVariables;
        this.generic = element instanceof ConstructorTemplate
            ? element.superclass.generic
            : element.generic;
        this.className = element instanceof ConstructorTemplate
            ? element.subclassName
            : element.name;
    }

    writeLineExpression(): this {
        if (this.isOverridable) {
            this.sb.write('@override', 1);
            this.sb.writeln();
        }

        this.sb.write(this.expression, 1);
        return this;
    }

    writeBlockExpression(): this {
        if (this.isOverridable) {
            this.sb.write('@override', 1);
            this.sb.writeln();
        }

        this.sb.write('String toString() {', 1);
        this.sb.writeln(`return ${this.value}`, 2);
        this.sb.writeln('}', 1);
        return this;
    }

    writeCode(): this {
        this.writeMethod();
        return this;
    }

    generate(): string {
        return this.sb.toString();
    }

    asOverridable(): this {
        this.isOverridable = true;
        return this;
    };

    get title(): string {
        return 'String toString()';
    }

    /**
     * @example 'String toString() => Result<$T>(value: $value, error: $error);'
     */
    get expression(): string {
        return `${this.title} => ${this.value}`;
    }

    get isOneLine(): boolean {
        return this.expression.length < 78;
    }

    /**
     * @example 'Result<$T>(value: $value, error: $error)';
     */
    private get value(): string {
        const params = this.parameters.expressionsOf('to-string').join(', ');
        return `'${this.className}${this.generic.typeString()}(${params})';`;
    }

    private writeMethod() {
        if (this.isOneLine) {
            this.writeLineExpression();
        } else {
            this.writeBlockExpression();
        }
    }
}