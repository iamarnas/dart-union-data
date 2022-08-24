import { AdaptiveMethodGenerator, ToStringMethodGenerator } from '.';
import { ConstructorTypes } from '../interface/element';
import { ClassDataTemplate, SubclassTemplate } from '../templates';
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
        // const constr = new ConstructorGenerator(this.element, this.name).asInitial();
        // const superConstr = new SuperConstructorGenerator(this.element);
        // const len = constr.length + superConstr.length;

        // if (len < 78) {
        //     this.sb.write(constr.value + superConstr.value);
        //     return this;
        // }

        // this.sb.write(constr.asBlock().value);
        return this;
    }

    writeMethods(): this {
        const methods = new AdaptiveMethodGenerator(this.element)
            .generate('map')
            .generate('maybeMap')
            .generate('mapOrNull')
            .generate('when')
            .generate('maybeWhen')
            .generate('whenOrNull').toList();
        this.sb.writeBlock(methods, '\n', 1);
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

    private isChecker(e: SubclassTemplate): string {
        const name = e.name.trimStart().capitalize();
        return `bool get is${name} => this is ${e.typeInterface};`;
    }

    private writeAsChecker() {
        this.sb.writeln();
        for (const constructor of this.element.factories) {
            this.sb.writeln(this.asChecker(constructor), 1);
        }
    }

    private asChecker(e: SubclassTemplate): string {
        const name = e.name.trimStart().capitalize();
        return `${e.typeInterface} get as${name} => this as ${e.typeInterface};`;
    }

    private writeAsOrNullChecker() {
        for (const constructor of this.element.factories) {
            this.asOrNullChecker(constructor);
        }
    }

    private asOrNullChecker(e: SubclassTemplate) {
        const name = e.name.trimStart().capitalize();
        const className = this.name.decapitalize();

        if (e.type === ConstructorTypes.factory) {
            this.sb.write(`${e.typeInterface} ? get as${name}OrNull {`, 1);
            this.sb.writeln(`final ${className} = this;`, 2);
            this.sb.writeln(`return ${className} is ${e.typeInterface} ? ${className} : null;`, 2);
            this.sb.writeln('}', 1);
        }
    }
}