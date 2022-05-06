import Argument from '../models/argument';
import { ConstructorData } from '../models/constructor.data';
import { StringBuffer } from '../utils/string-buffer';

export class CopyWithGenerator {
    private readonly implementationType: string;
    private readonly className: string;
    private readonly constructorName: string;
    private readonly parameters: Argument[] = [];
    private sb: StringBuffer = new StringBuffer();

    constructor(private readonly element: ConstructorData) {
        this.implementationType = element.displayType;
        this.className = element.subclass + 'CopyWith' + element.genericType;
        this.constructorName = element.subclass + 'CopyWith';
        this.parameters = element.parameters;
    }

    static fromElement(element: ConstructorData): CopyWithGenerator {
        return new CopyWithGenerator(element);
    }

    generate(): string {
        this.writeInterface();
        this.sb.writeln();
        this.writeImplementation();
        return this.sb.toString();
    }

    generateCopyWithMethod(): string {
        this.writeCopyWithMethod();
        return this.sb.toString();
    }

    private get params(): string[] {
        return this.parameters.map((e) => e.variable);
    }

    private get copyWithParams(): string[] {
        return this.parameters.map((e) => `Object? ${e.name} = _undefined`);
    }

    private get copyWithCallbacks(): string[] {
        return this.parameters.map((e) => {
            const prefix = e.isNamed ? `${e.name}: ` : '';

            if (e.name === 'value') {
                return `${prefix}${e.name} == _undefined ? this.value.${e.name} : ${e.name} as ${e.type}`;
            }

            return `${prefix}${e.name} == _undefined ? value.${e.name} : ${e.name} as ${e.type}`;
        });
    }

    private writeCopyWithMethod() {
        this.sb.writeln(`${this.className} get copyWith => _${this.constructorName}(this);`, 1);
    }

    private writeInterface() {
        this.sb.writeln(`abstract class ${this.className} {`);
        this.sb.writeln(`${this.implementationType} call({`, 1);
        this.sb.writeBlock(this.params, ',', 2);
        this.sb.writeln('});', 1);
        this.sb.writeln('}');
    }

    private writeImplementation() {
        this.sb.writeln(`class _${this.className} extends ${this.className} {`);
        this.sb.writeln('static const _undefined = Object();', 1);
        this.sb.writeln();
        this.sb.writeln(`final ${this.implementationType} value;`, 1);
        this.sb.writeln();
        this.sb.writeln(`_${this.constructorName}(this.value);`, 1);
        this.sb.writeln();
        this.sb.writeln('@override', 1);
        this.sb.writeln(`${this.implementationType} call({`, 1);
        this.sb.writeBlock(this.copyWithParams, ',', 2);
        this.sb.writeln('}) {', 1);
        this.sb.writeln(`return ${this.element.subclass}(`, 2);
        this.sb.writeBlock(this.copyWithCallbacks, ',', 3);
        this.sb.writeln(');', 2);
        this.sb.writeln('}', 1);
        this.sb.writeln('}');
    }
}