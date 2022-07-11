import { Parameter } from '../models/parameter';
import { ClassDataTemplate, ConstructorTemplate, ParametersTemplate } from '../templates';
import '../types/string';
import { buildString, StringBuffer } from '../utils/string-buffer';

export class ConstructorGenerator {
    private readonly sb = new StringBuffer();
    private parameters: ParametersTemplate;
    private sdkVersion: number;
    private isBlock = false;
    private isInitial = false;

    constructor(
        private readonly element: ConstructorTemplate | ClassDataTemplate,
        private readonly className: string,
    ) {
        if (element instanceof ConstructorTemplate) {
            this.sdkVersion = element.superclass.settings.sdkVersion;
            this.parameters = element.parameters;
        } else {
            this.sdkVersion = element.settings.sdkVersion;
            this.parameters = element.instanceVariables.asOptionalNamed();
        }
    }

    get lengthWithSuper(): number {
        return this.constant().length
            + this.className.length
            + this.localParameters().length
            + this.superConstructor().length;
    }

    get lengthWithoutSuper(): number {
        return this.constant().length
            + this.className.length
            + this.localParameters().length;
    }

    writeConstructor(): this {
        this.sb.write(this.constant());
        this.sb.write(`${this.className}`);
        this.sb.write(this.localParameters());
        this.sb.write(`${this.superConstructor()}`);
        return this;
    }

    writeConstructorWithoutSuper(): this {
        this.sb.write(this.constant());
        this.sb.write(`${this.className}`);
        this.sb.write(this.localParameters() + ';');
        return this;
    }

    asBlock(): this {
        this.isBlock = true;
        return this;
    }

    asInitial(): this {
        this.isInitial = true;
        return this;
    }

    generate(): string {
        return this.sb.toString();
    }

    private get isPrivate(): boolean {
        return this.element instanceof ConstructorTemplate
            ? this.element.superclass.hasPrivateConstructor
            : false;
    }

    private constant(): string {
        const isConst = this.parameters.all.every((e) => e.isFinal);
        return this.element instanceof ConstructorTemplate
            ? this.element.isConst || this.element.superclass.isImmutableData ? 'const ' : ''
            : isConst ? 'const ' : '';
    }

    private localParameters(): string {
        if (this.parameters.isEmpty) return '()';

        const required = this.filteredParamsBy((e) => !e.isOptional);
        const named = this.filteredParamsBy((e) => e.isNamed);
        const positional = this.filteredParamsBy((e) => e.isPositional);

        return buildString((sb) => {
            sb.write('(');

            if (this.parameters.hasRequiredParameters) {
                if (this.isBlock) {
                    if (this.parameters.hasOptionalParameters) {
                        sb.writeln();
                        sb.writeAll(required, ',\n ', 2);
                    } else {
                        sb.writeBlock(required, ', ', 2);
                        sb.writeln('\t');
                    }
                } else {
                    sb.writeAll(required, ', ');
                }
            }

            if (this.parameters.hasNamedParameters) {
                if (this.parameters.hasRequiredParameters) {
                    sb.write(', {');
                } else {
                    sb.write('{');
                }

                if (this.isBlock) {
                    sb.writeBlock(named, ', ', 2);
                    sb.writeln('}', 1);
                } else {
                    sb.writeAll(named, ', ');
                    sb.write('}');
                }
            }

            if (this.parameters.hasPositionalParameters) {
                if (this.parameters.hasRequiredParameters) {
                    sb.write(', [');
                } else {
                    sb.write('[');
                }

                if (this.isBlock) {
                    sb.writeBlock(positional, ', ', 2);
                    sb.writeln(']', 1);
                } else {
                    sb.writeAll(positional, ', ');
                    sb.write(']');
                }
            }

            sb.write(')');
        });
    }

    private filteredParamsBy(filter: (param: Parameter) => boolean): string[] {
        if (this.isInitial) {
            return this.parameters.all.filter(filter).map((e) => e.expression('this'));
        }

        if (this.sdkVersion >= 2.17 && !this.isPrivate) {
            return this.parameters.all.filter(filter).map((e) => {
                if (!e.isInitialized) return e.expression('this');
                if (e.isNamed && e.isSuper) return e.expression('super-name');
                if (!e.isNamed && e.isSuper) return e.expression('func-required-params');
                return e.expression('this');
            });
        }

        return this.parameters.all.filter(filter).map((e) => {
            if (!e.isInitialized) return e.expression('this');
            if (e.isSuper) return e.expression('func-required-params');
            return e.expression('this');
        });
    }

    private superConstructor(): string {
        const hasOnlyNamedParams = this.parameters.superParameters.every((e) => e.isNamed);
        const constr = this.element instanceof ConstructorTemplate
            ? this.element.superclass.generativeConstructor
            : undefined;
        // Super parameters are only allowed with named parameters
        // and not with a private constructor.
        if (this.sdkVersion >= 2.17 && hasOnlyNamedParams && !this.isPrivate) return ';';

        if (!constr) {
            return ' : super._();';
        }

        // Get a private constructor name created by the user. Otherwise returns `(`
        const prefix = constr.displayName.getRange(0, '(');
        const params = this.parameters.all
            .filter((e) => e.isInitialized)
            .map((e) => e.expression('super-params'));

        return ` : super${prefix}${params.join(', ')});`;
    }
}