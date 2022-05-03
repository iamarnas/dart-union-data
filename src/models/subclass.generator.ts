import Argument from '../element/argument';
import { ConstructorData } from '../element/constructor.data';
import { join } from '../utils/string-apis';
import { StringBuffer } from '../utils/string-buffer';

export default class SubclassGenerator {
    private readonly subclass: string;
    private sb: StringBuffer = new StringBuffer();

    constructor(private readonly element: ConstructorData, private readonly className: string) {
        this.subclass = element.subclass;
    }

    generate(): string {
        this.writeClassTop(this.element);
        this.writeConstructor(this.element);
        this.writeVariables(this.element);
        this.writeToString();
        this.writeClassEnd();
        return this.sb.toString();
    }

    private writeClassTop(e: ConstructorData) {
        this.sb.writeln(`class ${e.subclassWithGeneric} extends ${this.className} {`);
    }

    private writeConstructor(e: ConstructorData) {
        this.sb.writeln(this.classConstructor(), 1);
    }

    private writeVariables(e: ConstructorData) {
        if (!e.parameters) return;
        this.sb.writeln(this.varialble(e.parameters));
    }

    private writeToString() {
        this.sb.writeln('@override', 1);
        this.sb.writeln(this.element.toStringMethod(), 1);
    }

    private writeEqualityOperator() { }

    private writeHashCode() { }

    private writeClassEnd() {
        this.sb.writeln('}');
    }

    private varialble(args: Argument[]): string {
        const params = args.map((e) => `\tfinal ${e.type} ${e.name}`);
        return join(params, ';\n');
    }

    // TODO: implement constructor with parameters.
    private classConstructor(): string {
        return `const ${this.subclass}() : super._();`;
    }
}