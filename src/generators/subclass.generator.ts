import { ToStringMethodGenerator } from '.';
import { ParameterExpression } from '../codecs/parameter-codec';
import { Settings } from '../models/settings';
import { isDebugMode } from '../shared/constants';
import pubspec from '../shared/pubspec';
import { ConstructorTemplate, GenericTypeTemplate, ParametersTemplate } from '../templates';
import { StringBuffer } from '../utils/string-buffer';
import { ConstructorGenerator } from './constructor.generator';

export class SubclassGenerator {
    private readonly subclass: string;
    private readonly generic: GenericTypeTemplate;
    private readonly parameters: ParametersTemplate;
    private readonly settings: Settings;
    private sb: StringBuffer = new StringBuffer();

    constructor(
        private readonly element: ConstructorTemplate,
        readonly className: string,
    ) {
        this.subclass = element.subclassName;
        this.generic = element.superclass.generic;
        this.parameters = this.element.parameters;
        this.settings = this.element.superclass.settings;

        if (isDebugMode()) {
            console.log('Generated parameters for: ' + this.subclass, this.parameters.all);
        }
    }

    generate(): string {
        this.writeClassTop();
        this.writeConstructor();
        this.sb.writeln();
        this.writeVariables();
        if (this.parameters.isNotEmpty) {
            this.sb.writeln();
            this.writeCopyWithMethod();
        }
        this.sb.writeln();
        this.writeToString();
        this.sb.writeln();

        if (this.settings.equatable) {
            this.writeEquatableProps();
        } else {
            this.writeEqualityOperator();
            this.sb.writeln();
            this.writeHashCodeGetter();
        }

        this.writeClassEnd();
        return this.sb.toString();
    }

    /**
     * @example name == other.name
     */
    private get equals(): string[] {
        return this.parameters.expressionsOf('equal-to-other');
    }

    /**
     * @example value
     */
    private get names(): string[] {
        return this.parameters.expressionsOf('name');
    }

    /**
     * @example name.hashCode
     */
    private get hashCodes(): string[] {
        return this.parameters.expressionsOf('hashCode');
    }

    /**
     * Instance variables dependent on expression.
     * @example final String name
     */
    private varialbles(expression: ParameterExpression): string[] {
        return this.parameters.all.filter((e) => !e.isSuper).map((e) => {
            if (e.isGetter) {
                return '@override\n\t' + e.expression(expression);
            }

            return e.expression(expression);
        });
    }

    private writeClassTop() {
        // TODO: fix implementation
        const ex = 'extends'; //this.element.superclass.isImmutableData ? 'extends' : 'implements';
        const subclass = `${this.subclass}${this.generic.displayType}`;
        const superClass = `${this.className}${this.generic.type}`;
        const equatableMixin = !this.settings.equatable ? '' : 'with EquatableMixin ';
        this.sb.write(`class ${subclass} ${ex} ${superClass} ${equatableMixin}{`);
    }

    private writeConstructor() {
        this.sb.writeln(this.classConstructor(), 1);
    }

    private writeVariables() {
        if (this.parameters.isEmpty) return;
        if (this.element.isConst) {
            this.sb.writeBlock(this.varialbles('final-instance-variable'), ';', 1);
        } else {
            this.sb.writeBlock(this.varialbles('instance-variable'), ';', 1);
        }
    }

    private writeToString() {
        return new ToStringMethodGenerator(this.element)
            .asOverridable()
            .writeCode()
            .generate();
    }

    private writeEqualityOperator() {
        const values = !this.equals.length ? ';' : ` && ${this.equals.join(' && ')};`;
        const expression = `return other is ${this.element.typeInference}${values}`;

        this.sb.writeln('@override', 1);
        this.sb.writeln('bool operator ==(Object other) {', 1);
        this.sb.writeln('if (runtimeType != other.runtimeType) return false;', 2);

        if (expression.length < 76) {
            this.sb.writeln(expression, 2);
        } else {
            // Block
            this.sb.writeln(`return other is ${this.element.typeInference} &&\n`, 2);
            this.sb.writeAll(this.equals, ' &&\n', 4);
            this.sb.write(';');
        }

        this.sb.writeln('}', 1);
    }

    // TODO: do not write if equatable enabled.
    private writeHashCodeGetter() {
        if (pubspec.sdkVersion >= 2.14) {
            this.writeHashCodeObjects();
        } else {
            this.writeHashCodes();
        }
    }

    private writeHashCodes() {
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

    private writeHashCodeObjects() {
        const getter = 'int get hashCode => ';
        const objects = !this.names.length ? '0;' : `${this.names.join(', ')}`;
        const expression = `${getter}Object.hash(${objects});`;

        this.sb.writeln('@override', 1);
        // Object.hash() requires at least two values.
        if (this.names.length > 1) {
            if (expression.length < 78) {
                this.sb.writeln(expression, 1);
            } else {
                // Block
                this.sb.writeln(`${getter}Object.hash(`, 1);
                this.sb.writeBlock(this.names, ',', 4);
                this.sb.writeln(');', 2);
            }
        } else {
            if (this.parameters.isEmpty) {
                this.sb.writeln(`${getter}${objects}`, 1);
                return;
            }

            this.sb.writeln(`${getter}${objects}.hashCode;`, 1);
        }
    }

    private writeEquatableProps() {
        const getter = 'List<Object?> get props => ';
        const props = this.parameters.expressionsOf('name');
        const expression = `${getter}[${props.join(', ')}];`;

        this.sb.writeln('@override', 1);

        if (expression.length < 78) {
            this.sb.writeln(expression, 1);
        } else {
            this.sb.writeln(`${getter}[`, 1);
            this.sb.writeBlock(props, ',', 4);
            this.sb.writeln('];', 3);
        }
    }

    private writeClassEnd() {
        this.sb.writeln('}\n');
    }

    private writeCopyWithMethod() {
        const type = `${this.subclass}CopyWith${this.generic.type}`;
        this.sb.writeln(`${type} get copyWith => _${this.subclass}CopyWith(this);`, 1);
    }

    private classConstructor(): string {
        const constr = new ConstructorGenerator(this.element, this.subclass);
        const expressionBody = constr.writeConstructor().generate();

        if (expressionBody.length < 78) {
            return expressionBody;
        }

        return constr.asBlock().writeConstructor().generate();;
    }
}