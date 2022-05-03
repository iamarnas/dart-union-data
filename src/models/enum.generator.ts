import ClassData from '../element/class.data';
import { FieldElement } from '../element/element';
import { StringBuffer } from '../utils/string-buffer';
import { MethodGenerator } from './method.generator';

export class EnumDataGenerator {
    private element: ClassData;
    private name: string;
    private values: FieldElement[] = [];
    private sb: StringBuffer = new StringBuffer();

    constructor(element: ClassData) {
        this.element = element;
        this.name = element.name;
        this.values = element.fields;
    }

    generateExtension(): string {
        this.extensionName();
        this.checkers();
        this.methods();
        this.extensionEnd();
        return this.sb.toString();
    }

    /** Generates inside the enhanced enum class. */
    generateMethods(): string {
        this.checkers();
        this.methods();
        return this.sb.toString();
    }

    private extensionName() {
        const name = `${this.name}Extension`;
        this.sb.writeln(`extension ${name} on ${this.name} {`);
    }

    private checkers() {
        for (const value of this.values) {
            this.sb.writeln(this.writeChecker(value), 1);
        }
    }

    private writeChecker(e: FieldElement): string {
        var name = !!!e.name ? e.element.name : e.name;
        const value = name.trimStart()[0].toUpperCase() + name.slice(1);
        return `bool get is${value} => this == ${this.name}.${name};`;
    }

    private extensionEnd() {
        this.sb.writeln('}');
    }

    private methods() {
        const methodGenerator = MethodGenerator.fromElement(this.element);
        this.sb.writeln(methodGenerator.generate('map'));
        this.sb.writeln(methodGenerator.generate('maybeMap'));
        this.sb.writeln(methodGenerator.generate('mapOrNull'));
        this.sb.writeln(methodGenerator.generate('when'));
        this.sb.writeln(methodGenerator.generate('maybeWhen'));
        this.sb.writeln(methodGenerator.generate('whenOrNull'));
    }
}