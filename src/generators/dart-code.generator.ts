import { ConstructorGenerator, CopyWithGenerator, MethodGenerator, SubclassGenerator, ToStringMethodGenerator } from '.';
import { ConstructorTypes } from '../interface/element';
import { ClassDataTemplate, ConstructorTemplate } from '../templates';
import '../types/string';
import { StringBuffer } from '../utils/string-buffer';
import { MapMethodGenerator } from './map-mehtod.generator';

/** 
 * The data class which is the base generator that provides and sorts other generator classes.
 * @requires {@link ClassDataTemplate classDataTemplate} to set the generator output interface.
 */
export class DartCodeGenerator {
    /** The class name. */
    private readonly name: string;
    private sb: StringBuffer = new StringBuffer();
    readonly toStringMethod: ToStringMethodGenerator;

    constructor(private readonly element: ClassDataTemplate) {
        this.name = element.name;
        this.toStringMethod = new ToStringMethodGenerator(element);
    }

    writeAllCheckers(): this {
        this.writeIsChecker();
        this.writeAsChecker();
        this.writeAsOrNullChecker();
        return this;
    }

    writeIsCheckers(): this {
        this.writeIsChecker();
        return this;
    }

    writeAsCheckers(): this {
        this.writeAsChecker();
        return this;
    }

    writeAsOrNullCheckers(): this {
        this.writeAsOrNullChecker();
        return this;
    }

    writeSubclasses(): this {
        for (const factory of this.element.factories) {
            const subclass = new SubclassGenerator(factory, this.element.name).generate();
            const coopyWith = new CopyWithGenerator(factory).generate();

            this.sb.writeln();
            this.sb.writeln(subclass);

            if (factory.parameters.isNotEmpty) {
                this.sb.writeln(coopyWith);
            }
        }

        return this;
    }

    writeLocalCopyWith(): this {
        const coopyWith = new CopyWithGenerator(this.element).generate();
        this.sb.writeln(coopyWith);
        return this;
    }


    writeCopyWith(): this {
        for (const factory of this.element.factories) {
            const coopyWith = new CopyWithGenerator(factory).generate();
            this.sb.writeln(coopyWith);
        }

        return this;
    }

    writeCopyWithMethod(): this {
        const generator = new CopyWithGenerator(this.element);
        this.sb.write(generator.generateCopyWithMethod());
        return this;
    }

    writeFromMap(): this {
        const generator = new MapMethodGenerator(this.element);
        this.sb.write(generator.writeFromMap().generate());
        return this;
    }

    writeToMap(): this {
        const generator = new MapMethodGenerator(this.element);
        this.sb.write(generator.writeToMap().generate());
        return this;
    }

    writeJsonCodecs(): this {
        const generator = new MapMethodGenerator(this.element);
        this.sb.write(generator.writeJsonCodecs().generate());
        return this;
    }

    writeToJson(): this {
        const generator = new MapMethodGenerator(this.element);
        this.sb.write(generator.writeToJson().generate());
        return this;
    }

    writeFromJson(): this {
        const generator = new MapMethodGenerator(this.element);
        this.sb.write(generator.writeFromJson().generate());
        return this;
    }

    writeConstructor(): this {
        const generator = new ConstructorGenerator(this.element, this.name).asInitial();

        if (generator.lengthWithoutSuper < 78) {
            this.sb.write(generator.writeConstructorWithoutSuper().generate());
            return this;
        }

        this.sb.write(generator.asBlock().writeConstructorWithoutSuper().generate());
        return this;
    }

    writeMethods(): this {
        const methodGenerator = MethodGenerator.fromElement(this.element);
        this.sb.writeln(methodGenerator.generate('map'));
        this.sb.writeln(methodGenerator.generate('maybeMap'));
        this.sb.writeln(methodGenerator.generate('mapOrNull'));
        this.sb.writeln(methodGenerator.generate('when'));
        this.sb.writeln(methodGenerator.generate('maybeWhen'));
        this.sb.writeln(methodGenerator.generate('whenOrNull'));
        return this;
    }

    writeToString(option?: { overridable: boolean }): this {
        const toStringGenerator = new ToStringMethodGenerator(this.element);

        if (option?.overridable) {
            this.sb.write(toStringGenerator.asOverridable().writeCode().generate());
            return this;
        }

        this.sb.write(toStringGenerator.writeCode().generate());
        return this;
    }

    generate(): string {
        return this.sb.toString();
    }

    clean() {
        return this.sb.clean();
    }

    private writeIsChecker() {
        this.sb.writeln();
        for (const constructor of this.element.factories) {
            this.sb.writeln(this.isChecker(constructor), 1);
        }
    }

    private isChecker(e: ConstructorTemplate): string {
        const name = e.name.trimStart().capitalize();
        return `bool get is${name} => this is ${e.typeInference};`;
    }

    private writeAsChecker() {
        this.sb.writeln();
        for (const constructor of this.element.factories) {
            this.sb.writeln(this.asChecker(constructor), 1);
        }
    }

    private asChecker(e: ConstructorTemplate): string {
        const name = e.name.trimStart().capitalize();
        return `${e.typeInference} get as${name} => this as ${e.typeInference};`;
    }

    private writeAsOrNullChecker() {
        for (const constructor of this.element.factories) {
            this.asOrNullChecker(constructor);
        }
    }

    private asOrNullChecker(e: ConstructorTemplate) {
        const name = e.name.trimStart().capitalize();
        const className = this.name.decapitalize();

        if (e.type === ConstructorTypes.factory) {
            this.sb.write(`${e.typeInference} ? get as${name}OrNull {`, 1);
            this.sb.writeln(`final ${className} = this;`, 2);
            this.sb.writeln(`return ${className} is ${e.typeInference} ? ${className} : null;`, 2);
            this.sb.writeln('}', 1);
        }
    }
}