import { ActionValue } from '../interface';
import { ClassDataTemplate, GenericTypeTemplate, ParametersTemplate, SubclassTemplate } from '../templates';
import { buildString } from '../utils';

export class ToStringMethodGenerator implements ActionValue {
    private parameters: ParametersTemplate;
    private generic: GenericTypeTemplate;
    private className: string;

    constructor(element: SubclassTemplate | ClassDataTemplate) {
        this.parameters = element instanceof SubclassTemplate
            ? element.parameters
            : element.instances;
        this.generic = element.generic;
        this.className = element.name;
    }

    get key(): string {
        return 'String toString()';
    }

    get value(): string {
        return this.method();
    }

    get insertion(): string {
        return '\n' + this.value + '\n';
    }

    /**
     * @example 'Result<$T>(value: $value, error: $error)';
     */
    get callbackValue(): string {
        const params = this.parameters.expressionsOf('to-string').join(', ');
        return `'${this.className}${this.generic.typeString()}(${params})';`;
    }

    /**
     * @example 'String toString() => Result<$T>(value: $value, error: $error);'
     */
    private lineBody(): string {
        return `${this.key} => ${this.callbackValue}`;
    }

    private get isOneLine(): boolean {
        return this.lineBody().length < 78;
    }

    private blockBody(): string {
        return buildString((sb) => {
            sb.write(`${this.key} {`, 1);
            sb.writeln(`return ${this.callbackValue}`, 2);
            sb.writeln('}', 1);
        });
    }

    private method(): string {
        if (this.isOneLine) return this.lineBody();
        return this.blockBody();
    }
}