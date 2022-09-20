import { ActionValue } from '../interface';
import { Parameter } from '../models/parameter';
import { ClassDataTemplate, ParametersTemplate, SubclassTemplate } from '../templates';
import '../types/string';
import { buildString } from '../utils/string-buffer';

export class GenerativeConstructorGenerator implements ActionValue {
    readonly className: string;
    private parameters: ParametersTemplate;
    private formalParameters: ParametersTemplate;
    private sdkVersion: number;
    private isBlock = false;
    private isInitial = false;
    constructor(private element: SubclassTemplate | ClassDataTemplate) {
        this.className = element.name;
        this.sdkVersion = element.settings.sdkVersion;

        if (element instanceof SubclassTemplate) {
            this.parameters = element.parameters;
            this.formalParameters = element.superclass.formalPrameters;
        } else {
            this.parameters = element.instances;
            this.formalParameters = element.formalPrameters;
        }
    }

    get params(): Parameter[] {
        return this.parameters.all;
    }

    get value(): string {
        return buildString((sb) => {
            sb.write(this.modifier(), 1);
            sb.write(`${this.className}`);
            sb.write(this.localParameters());
        });
    }

    /**
     * The key represents the initialization expression of the constructor.
     * @example `const ClassName(` or const `ClassName({`
     */
    get key(): string {
        return this.value.slice(0, this.value.indexOf('(') + 1);
    }

    get insertion(): string {
        return '\n' + this.value + '\n';
    }

    get length(): number {
        return this.modifier().length
            + this.className.length
            + this.localParameters().length;
    }

    asBlock(option?: { auto: boolean }): this {
        if (!option) {
            this.isBlock = this.length < 78;
            return this;
        }

        this.isBlock = true;
        return this;
    }

    asInitial(): this {
        this.parameters = this.parameters.asOptionalNamed();
        this.isInitial = true;
        return this;
    }

    private get isPrivate(): boolean {
        return this.element instanceof SubclassTemplate
            ? this.element.superclass.hasPrivateConstructor
            : false;
    }

    private modifier(): string {
        const isConst = this.parameters.all.every((e) => e.isFinal);
        return this.element instanceof SubclassTemplate
            ? this.element.isConst || this.element.superclass.isImmutableData ? 'const ' : ''
            : isConst ? 'const ' : '';
    }

    localParameters(): string {
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
        const { all } = this.parameters;
        const formal = this.formalParameters.all;
        const initialized = [
            ...formal.filter((e) => all.some((p) => e.name === p.name)),
            ...all.filter((e) => !formal.some((p) => e.name === p.name)),
        ];
        const filtered = initialized.filter(filter).map((e) => {
            let sb = '';

            if (!e.isInitialized) {
                return e.expression('this');
            }

            if (e.isFinal) {
                sb = 'final ';
            }

            if (e.isRequired) {
                sb = 'required ';
            }

            if (e.type.startsWith('this.') || e.type.startsWith('super.')) {
                sb = sb + e.type;
            } else {
                sb = sb + `${e.type} ${e.name}`;
            }

            if (e.hasDefault) {
                sb = sb + ` = ${e.defaultValue}`;
            }

            return sb;
        }).sort((a, b) => Number(b.startsWith('required')) - Number(a.startsWith('required')));

        if (this.isInitial) {
            return filtered;
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
}

export class SuperConstructorGenerator implements ActionValue {
    private parameters: ParametersTemplate;
    private sdkVersion: number;

    constructor(private readonly element: SubclassTemplate | ClassDataTemplate) {
        if (element instanceof SubclassTemplate) {
            this.parameters = element.parameters;
        } else {
            this.parameters = element.instances.asOptionalNamed();
        }

        this.sdkVersion = element.settings.sdkVersion;
    }

    /**
     * The key represents the initialization expression of the constructor.
     * @example 
     * ' : super(' 
     * // If empty.
     * ';'
     */
    get key(): string {
        return this.value.slice(0, this.value.search('('));
    }

    get value(): string {
        return this.generateConstructor();
    }

    get insertion(): string {
        return this.value + '\n';
    }

    get length(): number {
        return this.generateConstructor().length;
    }

    private get isPrivate(): boolean {
        return this.element instanceof SubclassTemplate
            ? this.element.superclass.hasPrivateConstructor
            : false;
    }

    private generateConstructor(): string {
        const hasOnlyNamedParams = this.parameters.superParameters.every((e) => e.isNamed);
        const constr = this.element instanceof SubclassTemplate
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