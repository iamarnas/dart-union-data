import { MethodGenerator } from '.';
import { ElementKind, FieldElement } from '../interface';
import { ClassDataTemplate } from '../templates';
import '../types/string';
import { StringBuffer } from '../utils/string-buffer';

export class EnumDataGenerator {
    private element: ClassDataTemplate;
    private name: string;
    private values: FieldElement[] = [];
    private sb: StringBuffer = new StringBuffer();

    constructor(element: ClassDataTemplate) {
        if (element.kind !== ElementKind.enum) {
            console.error(SyntaxError('Error due to invalid element type'));
        }

        this.element = element;
        this.name = element.name;
        this.values = element.fields;
    }

    writeExtension(): this {
        this.sb.write(this.extensionTitle);
        this.sb.writeln();
        this.writeCheckers();
        this.sb.writeln();
        this.sb.writeln();
        this.writeMethods();
        this.sb.writeln('}');
        return this;
    }

    /** Generates inside the enhanced enum class or inside extension. */
    writeMethods(): this {
        this.sb.writeAll(this.methods(), '\n\n');
        return this;
    }

    /** Generates inside the enhanced enum class or inside extension. */
    writeCheckers(): this {
        this.sb.writeAll(this.checkers, '\n', 1);
        return this;
    }

    generate(): string {
        return this.sb.toString();
    }

    methods() {
        const methodGenerator = MethodGenerator.fromElement(this.element);
        return [
            methodGenerator.generate('map'),
            methodGenerator.generate('maybeMap'),
            methodGenerator.generate('mapOrNull'),
            methodGenerator.generate('when'),
            methodGenerator.generate('maybeWhen'),
            methodGenerator.generate('whenOrNull'),
        ];
    }

    get extensionTitle(): string {
        return `extension ${this.name}Extension on ${this.name} {`;
    }

    get checkers() {
        return this.values.map((e) => this.checker(e));
    }

    get checkerElements(): string[] {
        return ['bool ', 'get ', `=> this == ${this.name}.`, ';'];
    }

    private checker(e: FieldElement): string {
        const name = !e.name ? e.element.name : e.name;
        const value = name.trimStart().capitalize();
        return `bool get is${value} => this == ${this.name}.${name};`;
    }
}