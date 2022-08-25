import { ActionValue } from '../interface';
import { Settings } from '../models/settings';
import { ClassDataTemplate, ParametersTemplate, SubclassTemplate } from '../templates';
import { buildString } from '../utils';

export class EqualityGenerator {
    readonly operator: EqualityOperatorGenerator;
    readonly deepEquality: DeepCollectionOperatorGenerator;
    readonly equatable: EquatableGenerator;
    readonly hashCode: HashCodeGenerator;

    constructor(element: SubclassTemplate | ClassDataTemplate) {
        this.operator = new EqualityOperatorGenerator(element);
        this.deepEquality = new DeepCollectionOperatorGenerator(element);
        this.equatable = new EquatableGenerator(element);
        this.hashCode = new HashCodeGenerator(element);
    }
}

class EqualityOperatorGenerator implements ActionValue {
    private readonly parameters: ParametersTemplate;
    private typeInterface: string;

    constructor(element: SubclassTemplate | ClassDataTemplate) {
        this.typeInterface = element.typeInterface;
        this.parameters = element instanceof SubclassTemplate
            ? element.parameters
            : element.instances;
    }

    get value(): string {
        return this.operator();
    }

    get insertion(): string {
        return '\n' + this.value + '\n';
    }

    /**
     * @example 'bool operator ==('
     */
    get key(): string {
        return 'bool operator ==(';
    }

    /**
     * @example name == other.name
     */
    private get otherNames(): string[] {
        return this.parameters.expressionsOf('equal-to-other');
    }

    private operator(): string {
        const values = !this.otherNames.length
            ? ';'
            : ` && ${this.otherNames.join(' && ')};`;
        const expression = `return other is ${this.typeInterface}${values}`;

        return buildString((sb) => {
            sb.write('bool operator ==(Object other) {', 1);
            sb.writeln('if (runtimeType != other.runtimeType) return false;', 2);

            if (expression.length < 76) {
                sb.writeln(expression, 2);
            } else {
                // Block
                sb.writeln(`return other is ${this.typeInterface} &&\n`, 2);
                sb.writeAll(this.otherNames, ' &&\n', 4);
                sb.write(';');
            }

            sb.writeln('}', 1);
        });
    }
}

class EquatableGenerator implements ActionValue {
    private readonly parameters: ParametersTemplate;

    constructor(private readonly element: SubclassTemplate | ClassDataTemplate) {
        this.parameters = element instanceof SubclassTemplate
            ? element.parameters
            : element.instances;
    }

    /**
     * @example 'List<Object?> get props =>'
     */
    get key(): string {
        return 'List<Object?> get props =>';
    }

    get value(): string {
        return this.equality();
    }

    get insertion(): string {
        return '\n' + this.value + '\n';
    }

    /**
     * Equatable props values.
     */
    get props(): string[] {
        return this.parameters.expressionsOf('name');
    }

    private equality(): string {
        const expression = `${this.key} [${this.props.join(', ')}];`;

        return buildString((sb) => {
            if (expression.length < 78) {
                sb.write(expression, 1);
            } else {
                sb.write(`${this.key} [`, 1);
                sb.writeBlock(this.props, ',', 4);
                sb.writeln('];', 3);
            }
        });
    }
}

class DeepCollectionOperatorGenerator implements ActionValue {
    private readonly typeInterface: string;

    constructor(element: SubclassTemplate | ClassDataTemplate) {
        this.typeInterface = element.typeInterface;
    }

    /**
     * @example 'bool operator ==('
     */
    get key(): string {
        return 'bool operator ==(';
    }

    get value(): string {
        return this.deepCollectionOperator();
    }

    get insertion(): string {
        return '\n' + this.value + '\n';
    }

    private deepCollectionOperator(): string {
        return buildString((sb) => {
            sb.write(this.key + 'Object other) {', 1);
            sb.writeln('if (runtimeType != other.runtimeType) return false;', 2);
            sb.writeln('final mapEquals = const DeepCollectionEquality().equals;', 2);
            sb.writeln(`return other is ${this.typeInterface} && `, 2);
            sb.write('mapEquals(toMap(), other.toMap());');
            sb.writeln('}', 1);
        });
    }
}

class HashCodeGenerator implements ActionValue {
    private readonly parameters: ParametersTemplate;
    private readonly settings: Settings;

    constructor(element: SubclassTemplate | ClassDataTemplate) {
        this.parameters = element instanceof SubclassTemplate
            ? element.parameters
            : element.instances;
        this.settings = element.settings;
    }

    /**
     * @example 'int get hashCode =>'
     */
    get key(): string {
        return 'int get hashCode =>';
    }

    get value(): string {
        return this.hashCodeValue();
    }

    get insertion(): string {
        return '\n' + this.value + '\n';
    }

    /**
     * @example value
     */
    get names(): string[] {
        return this.parameters.expressionsOf('name');
    }

    /**
     * @example name.hashCode
     */
    get hashCodes(): string[] {
        return this.parameters.expressionsOf('hashCode');
    }

    private hashCodeValue(): string {
        if (this.settings.sdkVersion >= 2.14) {
            return this.hashCodeFromObject();
        } else {
            return this.hashCode();
        }
    }

    private hashCode(): string {
        const hashCodes = !this.hashCodes.length ? '0;' : `${this.hashCodes.join(' ^ ')};`;
        const expression = `${this.key} ${hashCodes}`;

        return buildString((sb) => {
            if (expression.length < 78) {
                sb.write(expression, 1);
            } else {
                // Block
                sb.write(this.key + '\n', 1);
                sb.writeAll(this.hashCodes, ' ^\n', 3);
                sb.write(';');
            }
        });
    }

    private hashCodeFromObject(): string {
        const objects = !this.names.length ? '0;' : `${this.names.join(', ')}`;
        const expression = `${this.key} Object.hash(${objects});`;

        return buildString((sb) => {
            // Object.hash() requires at least two values.
            if (this.names.length > 1) {
                if (expression.length < 78) {
                    sb.write(expression, 1);
                } else {
                    // Block
                    sb.write(`${this.key} Object.hash(`, 1);
                    sb.writeBlock(this.names, ',', 4);
                    sb.writeln(');', 2);
                }
            } else {
                if (this.parameters.isEmpty) {
                    sb.write(`${this.key} ${objects}`, 1);
                    return;
                }

                sb.write(`${this.key} ${objects}.hashCode;`, 1);
            }
        });
    }
}