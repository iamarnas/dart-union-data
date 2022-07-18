import { ClassDataTemplate, GenericTypeTemplate, ParametersTemplate, SubclassTemplate } from '../templates';
import { StringBuffer } from '../utils/string-buffer';

export class CopyWithGenerator {
    private readonly implementationType: string;
    private readonly className: string;
    private readonly parameters: ParametersTemplate;
    private readonly generic: GenericTypeTemplate;
    private sb: StringBuffer = new StringBuffer();

    constructor(private readonly element: SubclassTemplate | ClassDataTemplate) {
        this.implementationType = element.typeInterface;
        this.parameters = element instanceof ClassDataTemplate
            ? element.instances
            : element.parameters;
        this.generic = element instanceof ClassDataTemplate
            ? element.generic
            : element.superclass.generic;
        this.className = element instanceof ClassDataTemplate
            ? element.name + 'CopyWith'
            : element.subclassName + 'CopyWith';
    }

    static fromElement(element: SubclassTemplate | ClassDataTemplate): CopyWithGenerator {
        return new CopyWithGenerator(element);
    }

    generate(): string {
        this.writeInterface();
        this.sb.writeln();
        this.writeImplementation();
        return this.sb.toString();
    }

    generateCopyWithGetter(): string {
        this.writeCopyWithGetter();
        return this.sb.toString();
    }

    generateCopyWithMethod() {
        const className = this.className.slice(0, -8);
        this.sb.writeln(`${className} copyWith({`, 1);
        this.sb.writeBlock(this.nullableParams, ',', 2);
        this.sb.writeln('}) {', 1);
        this.sb.writeln(`return ${className}(`, 2);
        this.sb.writeBlock(this.callbacksParams, ',', 3);
        this.sb.writeln(');', 2);
        this.sb.writeln('}', 1);
        return this.sb.toString();
    }

    private get requiredParams(): string[] {
        return this.parameters.expressionsOf('func-required-params');
    }

    private get nullableParams(): string[] {
        return this.parameters.expressionsOf('nullable');
    }

    private get callbacksParams(): string[] {
        return this.parameters.expressionsOf('copy-with-callback');
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

    private writeCopyWithGetter() {
        this.sb.writeln(`${this.className}${this.generic.displayType} get copyWith => _${this.className}(this);`, 1);
    }

    private writeInterface() {
        this.sb.writeln(`abstract class ${this.className}${this.generic.displayType} {`);
        this.sb.writeln(`${this.implementationType} call({`, 1);
        this.sb.writeBlock(this.requiredParams, ',', 2);
        this.sb.writeln('});', 1);
        this.sb.writeln('}');
    }

    private writeImplementation() {
        const className = this.element instanceof SubclassTemplate
            ? this.element.subclassName
            : this.element.name;
        this.sb.writeln(`class _${this.className}${this.generic.displayType}`);
        this.sb.write(` extends ${this.className}${this.generic.type} {`);
        this.sb.writeln('static const _undefined = Object();', 1);
        this.sb.writeln();
        this.sb.writeln(`final ${this.implementationType} value;`, 1);
        this.sb.writeln();
        this.sb.writeln(`_${this.className}(this.value);`, 1);
        this.sb.writeln();
        this.sb.writeln('@override', 1);
        this.sb.writeln(`${this.implementationType} call({`, 1);
        this.sb.writeBlock(this.undefinedParams, ',', 2);
        this.sb.writeln('}) {', 1);
        this.sb.writeln(`return ${className}(`, 2);
        this.sb.writeBlock(this.copyWithCallbacks, ',', 3);
        this.sb.writeln(');', 2);
        this.sb.writeln('}', 1);
        this.sb.writeln('}');
    }
}