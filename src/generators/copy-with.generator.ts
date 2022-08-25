import { ActionValue } from '../interface';
import { ClassDataTemplate, GenericTypeTemplate, ParametersTemplate, SubclassTemplate } from '../templates';
import { buildString } from '../utils/string-buffer';

export class CopyWithGenerator {
    method: CopyWithMethodGenerator;
    getter: CopyWithGetterGenerator;
    interface: CopyWithInterfaceGenerator;
    implementation: CopyWithImplementationGenerator;

    constructor(element: SubclassTemplate | ClassDataTemplate) {
        this.method = new CopyWithMethodGenerator(element);
        this.getter = new CopyWithGetterGenerator(element);
        this.interface = new CopyWithInterfaceGenerator(element);
        this.implementation = new CopyWithImplementationGenerator(element);
    }
}

class CopyWithMethodGenerator implements ActionValue {
    private readonly className: string;
    private readonly typeInterface: string;
    private readonly parameters: ParametersTemplate;

    constructor(element: SubclassTemplate | ClassDataTemplate) {
        this.parameters = element instanceof ClassDataTemplate
            ? element.instances
            : element.parameters;
        this.className = element.name;
        this.typeInterface = element.typeInterface;
    }

    /**
     * @example 'ClassName<T> copyWith({'
     */
    get key(): string {
        return `${this.typeInterface} copyWith({`;
    }

    get value(): string {
        return this.method();
    }

    get insertion(): string {
        return '\n' + this.value + '\n';
    }

    private get nullableParams(): string[] {
        return this.parameters.expressionsOf('nullable');
    }

    private get callbacksParams(): string[] {
        return this.parameters.expressionsOf('copy-with-callback');
    }

    private method(): string {
        return buildString((sb) => {
            sb.write(this.key, 1);
            sb.writeBlock(this.nullableParams, ',', 2);
            sb.writeln('}) {', 1);
            sb.writeln(`return ${this.className}(`, 2);
            sb.writeBlock(this.callbacksParams, ',', 3);
            sb.writeln(');', 2);
            sb.writeln('}', 1);
        });
    }
}

class CopyWithGetterGenerator implements ActionValue {
    private readonly className: string;
    private readonly generic: GenericTypeTemplate;

    constructor(element: SubclassTemplate | ClassDataTemplate) {
        this.generic = element.generic;
        this.className = element.name + 'CopyWith';
    }

    /**
     * The key is identical to value due that this value is a one-line method and single class member.
     * @example 'UserCopyWith<T> get copyWith => _UserCopyWith(this);'
     */
    get key(): string {
        return this.value;
    }

    /**
     * @example UserCopyWith<T> get copyWith => _UserCopyWith(this);
     */
    get value(): string {
        return `\t${this.className}${this.generic.type} get copyWith => _${this.className}(this);`;
    }

    get insertion(): string {
        return '\n' + this.value + '\n';
    }
}

class CopyWithInterfaceGenerator implements ActionValue {
    private readonly implementationType: string;
    private readonly className: string;
    private readonly parameters: ParametersTemplate;
    private readonly generic: GenericTypeTemplate;

    constructor(element: SubclassTemplate | ClassDataTemplate) {
        this.implementationType = element.typeInterface;
        this.parameters = element instanceof ClassDataTemplate
            ? element.instances
            : element.parameters;
        this.generic = element.generic;
        this.className = element.name + 'CopyWith';
    }

    /**
     * The key represents the first row of the class.
     * @example `abstract class ClassName<T> {`
     */
    get key(): string {
        return this.value.split('\n')[0];
    }

    get value(): string {
        return this.interface();
    }

    get insertion(): string {
        return '\n' + this.value + '\n';
    }

    private get requiredParams(): string[] {
        return this.parameters.expressionsOf('func-required-params');
    }

    private interface() {
        return buildString((sb) => {
            sb.write(`abstract class ${this.className}${this.generic.displayType} {`);
            sb.writeln(`${this.implementationType} call({`, 1);
            sb.writeBlock(this.requiredParams, ',', 2);
            sb.writeln('});', 1);
            sb.writeln('}');
        });
    }
}

class CopyWithImplementationGenerator implements ActionValue {
    private readonly implementationType: string;
    private readonly className: string;
    private readonly parameters: ParametersTemplate;
    private readonly generic: GenericTypeTemplate;

    constructor(private element: SubclassTemplate | ClassDataTemplate) {
        this.implementationType = element.typeInterface;
        this.parameters = element instanceof ClassDataTemplate
            ? element.instances
            : element.parameters;
        this.generic = element.generic;
        this.className = element.name + 'CopyWith';
    }

    /**
     * The key represents the first row of the class.
     * @example `class SubClass<T> extends _SuperClass<T> {`
     */
    get key(): string {
        return this.value.split('\n')[0];
    }

    get value(): string {
        return this.implementation();
    }

    get insertion(): string {
        return '\n' + this.value + '\n';
    }


    private get undefinedParams(): string[] {
        return this.parameters.expressionsOf('undefined');
    }

    private get copyWithCallbacks(): string[] {
        const hasValue = this.parameters.all.some((e) => e.name === 'value');
        return this.parameters.all.map((e) => {
            const name = e.isNamed ? `${e.name}: ` : '';
            const modifier = hasValue ? 'this.' : '';
            const asType = e.type.startsWith('Object') ? '' : ` as ${e.type}`;
            const newln = '\n\t\t\t\t\t';
            const line = `${name}${e.name} == _undefined ? ${modifier}value.${e.name} : ${e.name}${asType}`;

            if (line.length < 78) {
                return line;
            }

            return `${name}${e.name} == _undefined${newln}? ${modifier}value.${e.name}${newln}: ${e.name}${asType}`;;
        });
    }

    private implementation() {
        const className = this.element.name;
        return buildString((sb) => {
            sb.write(`class _${this.className}${this.generic.displayType}`);
            sb.write(` extends ${this.className}${this.generic.type} {`);
            sb.writeln('static const _undefined = Object();', 1);
            sb.writeln();
            sb.writeln(`final ${this.implementationType} value;`, 1);
            sb.writeln();
            sb.writeln(`_${this.className}(this.value);`, 1);
            sb.writeln();
            sb.writeln('@override', 1);
            sb.writeln(`${this.implementationType} call({`, 1);
            sb.writeBlock(this.undefinedParams, ',', 2);
            sb.writeln('}) {', 1);
            sb.writeln(`return ${className}(`, 2);
            sb.writeBlock(this.copyWithCallbacks, ',', 3);
            sb.writeln(');', 2);
            sb.writeln('}', 1);
            sb.writeln('}');
        });
    }
}