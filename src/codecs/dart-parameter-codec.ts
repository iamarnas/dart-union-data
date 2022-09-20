import { Parameter } from '../models/parameter';
import '../types/string';
import { buildString } from '../utils';

type ParameterType = 'required' | 'named' | 'positional';

export type ParameterExpression = 'this'
    | 'name'
    | 'super-name'
    | 'func-params'
    | 'func-required-params'
    | 'instance-variable'
    | 'final-instance-variable'
    | 'to-string'
    | 'hashCode'
    | 'equal-to-other'
    | 'undefined'
    | 'copy-with-callback'
    | 'nullable'
    | 'super-params';

export interface DartParameterCodec {
    encode(input: string, type: ParameterType): Parameter;
    decode(param: Parameter, expression: ParameterExpression): string
}

export namespace DartParameterCodec {
    export function encode(input: string, type: ParameterType): Parameter {
        const isOptional = type === 'named' || type === 'positional';
        const isPositional = type === 'positional';
        const isNamed = type === 'named';
        const parameter = new Parameter();
        const copy = { ...parameter };
        // Expected split expression 
        // Example: ['final', 'Map<String, dynamic>', 'json', '=', 'const', '{}']
        const split = analyzeParameterSyntax(input).splitWhere(' ', '<', '>');

        if (split.at(0) === 'required') {
            copy.isRequired = true;
            split.removeFirst();
        }

        if (split.at(0) === 'final') {
            copy.isFinal = true;
            split.removeFirst();
        }

        if (split.includes('=')) {
            const modifier = split.at(-2) ?? '';
            const value = split.at(-1) ?? '';

            if (modifier === 'const') {
                copy.defaultValue = `${modifier} ${value}`;
                copy.value = value;
            } else {
                copy.defaultValue = value;
                copy.value = value;
            }

            split.splice(split.indexOf('='));
        }

        if (split.at(1)?.startsWith('Function')) {
            copy.name = split.removeLast() ?? '';
            copy.type = `${split[0]} ${split[1]}`;
            copy.isOptional = isOptional;
            copy.isPositional = isPositional;
            copy.isNamed = isNamed;
            copy.isNullable = split[1].endsWith('?') ?? false;
        } else {
            if (split.at(0)?.startsWith('this.') ?? false) {
                copy.name = `${split[0]}`.replace('this.', '');
            } else {
                copy.name = `${split[1]}`;
            }

            copy.type = `${split[0]}`;
            copy.isOptional = isOptional;
            copy.isPositional = isPositional;
            copy.isNamed = isNamed;
            copy.isNullable = split[0].endsWith('?') ?? false;
        }

        return parameter.copyWith(copy);
    }

    export function decode(param: Parameter, expression: ParameterExpression): string {
        return buildString((sb) => {
            switch (expression) {
                case 'this':
                    if (param.isRequired || param.isExplicitlyNullable) {
                        sb.write('required ');
                    }

                    sb.write(`this.${param.name}`);

                    if (param.hasDefault) {
                        sb.write(` = ${param.defaultValue}`);
                    }

                    break;
                case 'instance-variable':
                    sb.write(`${param.type}`);

                    if (param.isExplicitlyNullable) {
                        sb.write('?');
                    }

                    sb.write(` ${param.name}`);
                    break;
                case 'final-instance-variable':
                    sb.write(`final ${param.type}`);

                    if (param.isExplicitlyNullable) {
                        sb.write('?');
                    }

                    sb.write(` ${param.name}`);
                    break;
                case 'undefined':
                    sb.write('Object');

                    if (param.isExplicitlyNullable || param.isNullable) {
                        sb.write('?');
                    }

                    sb.write(` ${param.name} = _undefined`);
                    break;
                case 'func-required-params':
                    if (param.isRequired) {
                        sb.write('required ');
                    }

                    sb.write(`${param.type} ${param.name}`);
                    break;
                case 'nullable':
                    if (param.isNullable) {
                        sb.write(`${param.type} ${param.name}`);
                        break;
                    }

                    sb.write(`${param.type}? ${param.name}`);
                    break;
                case 'copy-with-callback':
                    sb.write(`${param.name}: ${param.name} ?? this.${param.name}`);
                    break;
                case 'func-params':
                    sb.write(`${param.type} ${param.name}`);
                    break;
                case 'to-string':
                    sb.write(`${param.name}: $${param.name}`);
                    break;
                case 'hashCode':
                    sb.write(`${param.name}.hashCode`);
                    break;
                case 'name':
                    sb.write(`${param.name}`);
                    break;
                case 'super-params':
                    if (param.isNamed) {
                        sb.write(`${param.name}: ${param.name}`);
                        break;
                    }

                    sb.write(`${param.name}`);
                    break;
                case 'equal-to-other':
                    sb.write(`${param.name} == other.${param.name}`);
                    break;
                case 'super-name':
                    sb.write(`super.${param.name}`);
                    break;
            }
        });
    }
}

/**
 * Analyzes parameter input and correct syntax if not matches dart style.
 */
function analyzeParameterSyntax(parameter: string): string {
    if (parameter.indexOf('=') === - 1) return parameter;
    if (parameter.indexOf(' = ') !== - 1) return parameter;
    return parameter.replace(/\s*=\s*/, ' = ');
}