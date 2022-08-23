import { ParameterExpression } from '../codecs/dart-parameter-codec';
import { Settings } from '../models/settings';
import { isDebugMode } from '../shared/constants';
import { GenericTypeTemplate, ParametersTemplate, SubclassTemplate } from '../templates';
import { StringBuffer } from '../utils/string-buffer';

export class SubclassGenerator {
    private readonly subclass: string;
    private readonly generic: GenericTypeTemplate;
    private readonly parameters: ParametersTemplate;
    private readonly settings: Settings;
    private sb: StringBuffer = new StringBuffer();

    constructor(
        private readonly element: SubclassTemplate,
        readonly className: string,
    ) {
        this.subclass = element.name;
        this.generic = element.generic;
        this.parameters = this.element.parameters;
        this.settings = this.element.superclass.settings;

        if (isDebugMode()) {
            console.log('Generated parameters for: ' + this.subclass, this.parameters.all);
        }
    }

    generate(): string {
        this.writeClassTop();
        // this.writeConstructor();
        this.sb.writeln();
        this.writeVariables();
        if (this.parameters.isNotEmpty) {
            this.sb.writeln();
            this.writeCopyWithMethod();
        }
        this.sb.writeln();
        // this.writeToString();
        this.sb.writeln();
        this.writeEqualityOperator();
        this.writeClassEnd();
        return this.sb.toString();
    }

    private writeEqualityOperator() {
        //this.sb.writeln(new EqualityGenerator(this.element).generateEquality());
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
        const equatableMixin = !this.settings.useEquatable ? '' : 'with EquatableMixin ';
        this.sb.write(`class ${subclass} ${ex} ${superClass} ${equatableMixin}{`);
    }

    // private writeConstructor() {
    //     this.sb.writeln(this.classConstructor(), 1);
    // }

    private writeVariables() {
        if (this.parameters.isEmpty) return;
        if (this.element.isConst) {
            this.sb.writeBlock(this.varialbles('final-instance-variable'), ';', 1);
        } else {
            this.sb.writeBlock(this.varialbles('instance-variable'), ';', 1);
        }
    }

    // private writeToString() {
    //     return new ToStringMethodGenerator(this.element)
    //         .asOverridable()
    //         .writeCode()
    //         .generate();
    // }

    private writeClassEnd() {
        this.sb.writeln('}\n');
    }

    private writeCopyWithMethod() {
        const type = `${this.subclass}CopyWith${this.generic.type}`;
        this.sb.writeln(`${type} get copyWith => _${this.subclass}CopyWith(this);`, 1);
    }

    // private classConstructor(): string {
    //     const constr = new ConstructorGenerator(this.element, this.subclass);
    //     const expressionBody = constr.writeConstructor().generate();

    //     if (expressionBody.length < 78) {
    //         return expressionBody;
    //     }

    //     return constr.asBlock().writeConstructor().generate();;
    // }
}