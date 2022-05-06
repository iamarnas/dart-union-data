import Argument from '../models/argument';
import { getWithoutGenericType, getGenericType } from '../models/class.data';
import { ConstructorData } from '../models/constructor.data';
import { StringBuffer } from '../utils/string-buffer';

export default class SubclassGenerator {
    private readonly subclass: string;
    private readonly superClass: string;
    private readonly superClassGeneric: string;
    private sb: StringBuffer = new StringBuffer();

    constructor(private readonly element: ConstructorData, private readonly className: string) {
        this.subclass = element.subclass;
        this.superClass = getWithoutGenericType(className);
        this.superClassGeneric = getGenericType(className);
    }

    get params(): Argument[] {
        return this.element.parameters;
    }

    generate(): string {
        this.writeClassTop();
        this.writeConstructor();
        this.writeVariables();
        this.writeToString();
        this.writeClassEnd();
        return this.sb.toString();
    }

    private varialbles(): string[] {
        return this.params.map((e) => e.variable);
    }

    private writeClassTop() {
        const subclass = `${this.subclass}${this.superClassGeneric}`;
        const superClass = `${this.superClass}${this.element.genericType}`;
        this.sb.writeln(`class ${subclass} extends ${superClass} {`);
    }

    private writeConstructor() {
        this.sb.writeln(this.classConstructor(), 1);
    }

    private writeVariables() {
        if (!this.params.length) return;
        this.sb.writeAll(this.varialbles(), ';\n', 1);
    }

    private writeToString() {
        const expression = `String toString() => ${this.element.toStringValue}`;

        if (expression.length < 78) {
            this.sb.writeln('@override', 1);
            this.sb.writeln(expression, 1);
        } else {
            this.sb.writeln('@override', 1);
            this.sb.writeln('String toString() {', 1);
            this.sb.writeln(`return ${this.element.toStringValue}`, 2);
            this.sb.writeln('}', 1);
        }

    }

    private writeEqualityOperator() { }

    private writeHashCode() { }

    private writeClassEnd() {
        this.sb.writeln('}');
    }

    // TODO: implement constructor with parameters.
    private classConstructor(): string {
        return `const ${this.subclass}(${this.element.initValues}) : super._();`;
    }
}