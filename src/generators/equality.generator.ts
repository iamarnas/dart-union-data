import { Settings } from '../models/settings';
import { ClassDataTemplate, ParametersTemplate, SubclassTemplate } from '../templates';
import { StringBuffer } from '../utils';

export class EqualityGenerator {
    private readonly parameters: ParametersTemplate;
    private readonly settings: Settings;
    private sb: StringBuffer = new StringBuffer();

    constructor(private readonly element: SubclassTemplate | ClassDataTemplate) {
        this.parameters = element instanceof SubclassTemplate
            ? element.parameters
            : element.instances;
        this.settings = element instanceof SubclassTemplate
            ? element.superclass.settings
            : element.settings;
    }

    generateEquality(): string {
        if (this.settings.equatable) {
            this.writeEquatableEquality();
            return this.sb.toString();
        }

        this.writeEqualityOperator();
        return this.sb.toString();
    }

    generateEquatable(): string {
        this.writeEquatableEquality();
        return this.sb.toString();
    }

    generateHashCode(): string {
        this.writeHashCodeGetter();
        return this.sb.toString();
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

    /**
     * @example name == other.name
     */
    private get otherNames(): string[] {
        return this.parameters.expressionsOf('equal-to-other');
    }

    private writeEqualityOperator() {
        const values = !this.otherNames.length ? ';' : ` && ${this.otherNames.join(' && ')};`;
        const expression = `return other is ${this.element.typeInterface}${values}`;

        this.sb.write('bool operator ==(Object other) {', 1);
        this.sb.writeln('if (runtimeType != other.runtimeType) return false;', 2);

        if (expression.length < 76) {
            this.sb.writeln(expression, 2);
        } else {
            // Block
            this.sb.writeln(`return other is ${this.element.typeInterface} &&\n`, 2);
            this.sb.writeAll(this.otherNames, ' &&\n', 4);
            this.sb.write(';');
        }

        this.sb.writeln('}', 1);
    }

    private writeHashCodeGetter() {
        if (this.settings.sdkVersion >= 2.14) {
            this.writeHashCodeObject();
        } else {
            this.writeHashCode();
        }
    }

    private writeHashCode() {
        const getter = 'int get hashCode => ';
        const hashCodes = !this.hashCodes.length ? '0;' : `${this.hashCodes.join(' ^ ')};`;
        const expression = `${getter}${hashCodes}`;

        if (expression.length < 78) {
            this.sb.write(expression, 1);
        } else {
            // Block
            this.sb.write(getter + '\n', 1);
            this.sb.writeAll(this.hashCodes, ' ^\n', 3);
            this.sb.write(';');
        }
    }

    private writeHashCodeObject() {
        const getter = 'int get hashCode => ';
        const objects = !this.names.length ? '0;' : `${this.names.join(', ')}`;
        const expression = `${getter}Object.hash(${objects});`;

        // Object.hash() requires at least two values.
        if (this.names.length > 1) {
            if (expression.length < 78) {
                this.sb.write(expression, 1);
            } else {
                // Block
                this.sb.write(`${getter}Object.hash(`, 1);
                this.sb.writeBlock(this.names, ',', 4);
                this.sb.writeln(');', 2);
            }
        } else {
            if (this.parameters.isEmpty) {
                this.sb.write(`${getter}${objects}`, 1);
                return;
            }

            this.sb.write(`${getter}${objects}.hashCode;`, 1);
        }
    }

    private writeEquatableEquality() {
        const getter = 'List<Object?> get props => ';
        const expression = `${getter}[${this.names.join(', ')}];`;

        if (expression.length < 78) {
            this.sb.write(expression, 1);
        } else {
            this.sb.write(`${getter}[`, 1);
            this.sb.writeBlock(this.names, ',', 4);
            this.sb.writeln('];', 3);
        }
    }
}