import Argument from '../models/argument';
import { getGenericType, getWithoutGenericType } from '../models/class.data';
import { ConstructorData } from '../models/constructor.data';
import pubspec from '../shared/pubspec';
import StringBuffer from '../utils/string-buffer';

export default class SubclassGenerator {
    private readonly subclass: string;
    private readonly superClass: string;
    private readonly superClassGeneric: string;
    private sb: StringBuffer = new StringBuffer();

    constructor(
        private readonly element: ConstructorData,
        private readonly className: string,
    ) {
        this.subclass = element.subclass;
        this.superClass = getWithoutGenericType(className);
        this.superClassGeneric = getGenericType(className);
    }

    generate(): string {
        this.writeClassTop();
        this.writeConstructor();
        this.sb.writeln();
        this.writeVariables();
        this.sb.writeln();
        this.writeCopyWithMethod();
        this.sb.writeln();
        this.writeToString();
        this.sb.writeln();
        this.writeEqualityOperator();
        this.sb.writeln();
        this.writeHashCodeGetter();
        this.writeClassEnd();
        return this.sb.toString();
    }

    private get params(): Argument[] {
        return this.element.arguments;
    }

    private get operatorValues(): string[] {
        return this.params.map((e) => `${e.name} == other.${e.name}`);
    }

    private get objects(): string[] {
        return this.params.map((e) => `${e.name}`);
    }

    private get hashCodes(): string[] {
        return this.params.map((e) => `${e.name}.hashCode`);
    }

    private get varialbles(): string[] {
        return this.params.map((e) => e.typeAndName);
    }

    private get finalVarialbles(): string[] {
        return this.params.map((e) => e.finalVariable);
    }

    private writeClassTop() {
        const subclass = `${this.subclass}${this.superClassGeneric}`;
        const superClass = `${this.superClass}${this.element.genericType}`;
        this.sb.write(`class ${subclass} extends ${superClass} {`);
    }

    private writeConstructor() {
        this.sb.writeln(this.classConstructor(), 1);
    }

    private writeVariables() {
        if (!this.params.length) return;
        this.sb.writeBlock(this.finalVarialbles, ';', 1);
    }

    private writeToString() {
        const expression = `String toString() => ${this.element.toStringValue}`;

        if (expression.length < 78) {
            this.sb.writeln('@override', 1);
            this.sb.writeln(expression, 1);
        } else {
            // Block
            this.sb.writeln('@override', 1);
            this.sb.writeln('String toString() {', 1);
            this.sb.writeln(`return ${this.element.toStringValue}`, 2);
            this.sb.writeln('}', 1);
        }

    }

    private writeEqualityOperator() {
        const values = !this.operatorValues.length ? ';' : ` && ${this.operatorValues.join(' && ')};`;
        const expression = `return other is ${this.element.displayType}${values}`;

        this.sb.writeln('@override', 1);
        this.sb.writeln('bool operator ==(Object other) {', 1);
        this.sb.writeln('if (runtimeType != other.runtimeType) return false;', 2);

        if (expression.length < 76) {
            this.sb.writeln(expression, 2);
        } else {
            // Block
            this.sb.writeln(`return other is ${this.element.displayType} &&\n`, 2);
            this.sb.writeAll(this.operatorValues, ' &&\n', 4);
            this.sb.write(';');
        }

        this.sb.writeln('}', 1);
    }

    // TODO: do not write if equatable enabled.
    private writeHashCodeGetter() {
        if (pubspec.sdkVersion >= 2.14) {
            this.writeHashCodeObject();
        } else {
            this.writeHashCode();
        }
    }

    private writeHashCode() {
        const getter = 'int get hashCode => ';
        const hashCodes = !this.hashCodes.length ? '0;' : `${this.hashCodes.join(' ^ ')};`;
        const expression = `${getter}${hashCodes}`;

        this.sb.writeln('@override', 1);

        if (expression.length < 78) {
            this.sb.writeln(expression, 1);
        } else {
            // Block
            this.sb.writeln(getter + '\n', 1);
            this.sb.writeAll(this.hashCodes, ' ^\n', 3);
            this.sb.write(';');
        }
    }

    private writeHashCodeObject() {
        const getter = 'int get hashCode => ';
        const objects = !this.objects.length ? '0;' : `${this.objects.join(', ')}`;
        const expression = `${getter}Object.hash(${objects});`;

        this.sb.writeln('@override', 1);
        // Object.hash() requires at least two values.
        if (this.objects.length > 1) {
            if (expression.length < 78) {
                this.sb.writeln(expression, 1);
            } else {
                // Block
                this.sb.writeln(`${getter}Object.hash(`, 1);
                this.sb.writeBlock(this.objects, ',', 4);
                this.sb.writeln(');', 2);
            }
        } else {
            this.sb.writeln(`${getter}${objects}.hashCode;`, 1);
        }
    }

    private writeClassEnd() {
        this.sb.writeln('}\n');
    }

    private writeCopyWithMethod() {
        const type = `${this.element.subclass}CopyWith${this.element.genericType}`;
        this.sb.writeln(`${type} get copyWith => _${this.element.subclass}CopyWith(this);`, 1);
    }

    // TODO: implement super constructor.
    private classConstructor(): string {
        const line = `const ${this.subclass}(${this.element.initValues()}) : super._();`;
        if (line.length < 78) return line;
        return `const ${this.subclass}(${this.element.initValues(true)}) : super._();`;
    }
}