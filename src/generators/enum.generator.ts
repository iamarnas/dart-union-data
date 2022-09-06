import { AdaptiveMethodGenerator } from '.';
import { ActionValue, ElementKind, FieldElement } from '../interface';
import { ClassDataTemplate } from '../templates';
import '../types/string';
import { buildString } from '../utils/string-buffer';

export class EnumDataGenerator {
    private name: string;
    private values: FieldElement[] = [];

    constructor(private element: ClassDataTemplate) {
        if (element.kind !== ElementKind.enum) {
            console.error(SyntaxError('Error due to invalid element type'));
        }

        this.name = element.typeInterface;
        this.values = element.fields;
    }

    get extension(): ActionValue {
        const value = buildString((sb) => {
            sb.write(this.extensionTitle);
            sb.writeBlock(this.checkers.map((e) => e.value));
            sb.writeln();
            sb.writeAll(this.methods.map((e) => e.insertion));
            sb.write('}');
        });

        return {
            key: this.extensionTitle,
            value: value,
            insertion: '\n' + value + '\n',
        };
    }

    get methods(): ActionValue[] {
        return [
            new AdaptiveMethodGenerator(this.element).generate('map'),
            new AdaptiveMethodGenerator(this.element).generate('maybeMap'),
            new AdaptiveMethodGenerator(this.element).generate('mapOrNull'),
            new AdaptiveMethodGenerator(this.element).generate('when'),
            new AdaptiveMethodGenerator(this.element).generate('maybeWhen'),
            new AdaptiveMethodGenerator(this.element).generate('whenOrNull'),
        ];
    }

    /**
     * @example
     * 'extension ResultExtension on Result {'
     */
    get extensionTitle(): string {
        return `extension ${this.name}Extension on ${this.name} {`;
    }

    get checkers(): ActionValue[] {
        return this.values.map((e) => new EnumCheckerGenerator(e, this.name));
    }

    /**
     * The `enum` dynamic checker elements used to find the all checkers in the code.
     */
    get checkerElements(): string[] {
        return ['bool ', 'get ', '=>', 'this ==', `${this.name}.`, ';'];
    }
}

class EnumCheckerGenerator implements ActionValue {
    constructor(private field: FieldElement, readonly className: string) { }

    /**
     * The trimmed Enum member value.
     * @example 'bool get isLoading => this == Result.loading;'
     */
    get key(): string {
        return this.value.trim();
    }

    /**
     * @example 
     * // The enum checker.
     * bool get isLoading => this == Result.loading;
     */
    get value(): string {
        const value = !this.field.name ? this.field.element.name : this.field.name;
        const name = value.capitalize();
        return `\tbool get is${name} => this == ${this.className}.${value};`;
    }

    get insertion(): string {
        return '\n' + this.value;
    }
}