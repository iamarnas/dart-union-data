import { ConstructorTypes, FieldElement } from '../interface/element';
import { ClassData } from '../models/class.data';
import { ConstructorData } from '../models/constructor.data';
import StringBuffer from '../utils/string-buffer';
import { CopyWithGenerator } from './copy-with.generator';
import { MethodGenerator } from './method.generator';
import SubclassGenerator from './subclass.generator';

export class ClassDataGenerator {
    /** The class name. */
    private readonly name: string;
    private readonly fields: FieldElement[] = [];
    private readonly constructors: ConstructorData[] = [];
    private sb: StringBuffer = new StringBuffer();

    constructor(private readonly element: ClassData) {
        this.name = element.name;
        this.fields = element.fields;
        this.constructors = element.constructors;
    }

    generateAllCheckers(): string {
        this.writeIsChecker();
        this.writeAsChecker();
        this.writeAsOrNullChecker();
        return this.sb.toString();
    }

    // TODO: test string. Should adds to the buffer.
    generateSubclasses(): string {
        for (const factory of this.element.factories) {
            const subclass = new SubclassGenerator(factory, this.element.displayName).generate();
            this.sb.writeln(subclass);
        }
        return this.sb.toString();
    }

    // TODO: test string. Should adds to the buffer.
    generateCopyWith(): string {
        for (const factory of this.element.factories) {
            const coopyWith = new CopyWithGenerator(factory).generate();
            this.sb.writeln(coopyWith);
        }
        return this.sb.toString();
    }

    // TODO: test string. Should adds to the buffer.
    generateMethods() {
        const methodGenerator = MethodGenerator.fromElement(this.element);
        this.sb.writeln(methodGenerator.generate('map'));
        this.sb.writeln(methodGenerator.generate('maybeMap'));
        this.sb.writeln(methodGenerator.generate('mapOrNull'));
        this.sb.writeln(methodGenerator.generate('when'));
        this.sb.writeln(methodGenerator.generate('maybeWhen'));
        this.sb.writeln(methodGenerator.generate('whenOrNull'));
        return this.sb.toString();
    }

    private writeIsChecker() {
        this.sb.writeln();
        for (const constructor of this.element.factories) {
            this.sb.writeln(this.isChecker(constructor), 1);
        }
    }

    private isChecker(e: ConstructorData): string {
        const name = e.name.trimStart()[0].toUpperCase() + e.name.slice(1);
        return `bool get is${name} => this is ${e.displayType};`;
    }

    private writeAsChecker() {
        this.sb.writeln();
        for (const constructor of this.element.factories) {
            this.sb.writeln(this.asChecker(constructor), 1);
        }
    }

    private asChecker(e: ConstructorData): string {
        const name = e.name.trimStart()[0].toUpperCase() + e.name.slice(1);
        return `${e.displayType} get as${name} => this as ${e.displayType};`;
    }

    private writeAsOrNullChecker() {
        for (const constructor of this.element.factories) {
            this.asOrNullChecker(constructor);
        }
    }

    private asOrNullChecker(e: ConstructorData) {
        const name = e.name.trimStart()[0].toUpperCase() + e.name.slice(1);
        const className = this.name[0].toLowerCase() + this.name.slice(1);

        if (e.type === ConstructorTypes.factory) {
            this.sb.writeln();
            this.sb.writeln(`${e.displayType} ? get as${name}OrNull {`, 1);
            this.sb.writeln(`final ${className} = this;`, 2);
            this.sb.writeln(`return ${className} is ${e.displayType} ? ${className} : null;`, 2);
            this.sb.writeln('}', 1);
        }
    }
}