import { ParameterCodec } from '../codecs/parameter-codec';
import '../types/string';
import { Parameter } from './parameter';

/**
 * A class that converts parameters from a given string.
 * - **Note:** `input` must contain a constructor `(...)` to determine parameters range.
 */
export class ParameterConverter extends ParameterCodec {
    private constructorRegx = /\((.*)\)/;
    private namedParamsRegx = /\{(.*)\}/;
    private positionalParamsRegx = /\[(.*)\]/;
    private namedOrPositionalRegx = /\{(.*)\}|\[(.*)\]/g;
    private paramsInput = '';

    /** @param {string} input a string that contains the constructor. */
    constructor(private readonly input: string) {
        super();
        this.paramsInput = this.constructorRegx.exec(input)?.at(1) ?? '';
    }

    /**
     * Splits parameters string with a comma without splitting generic types as `Map<String, dynamic>`.
     * @param input a string with parameters from the constructor.
     * @returns a string list with parameters split by comma.
     */
    split(input: string): string[] {
        return input.splitWhere(',', '<', '>');
    }

    get requiredParameters(): string[] {
        const match = this.paramsInput.replace(this.namedOrPositionalRegx, '');
        return this.split(match);
    }

    get namedParameters(): string[] {
        const match = this.namedParamsRegx.exec(this.paramsInput)?.at(1);
        if (!match) return [];
        return this.split(match);
    }

    get positionalParameters(): string[] {
        // Skip constructor with named parameters due to some default values ending with `]`.
        const namedParams = /^\(.*}\)$/;
        const match = this.positionalParamsRegx.exec(this.paramsInput)?.at(1);
        if (!match || namedParams.test(this.input)) return [];
        return this.split(match);
    }

    get size(): number {
        return this.requiredParameters.length
            + this.namedParameters.length
            + this.positionalParameters.length;
    }

    get hasData(): boolean {
        return this.paramsInput.length !== 0;
    }

    get hasRequiredParameters(): boolean {
        return this.requiredParameters.length !== 0;
    }

    get hasNamedParameters(): boolean {
        return this.namedParameters.length !== 0;
    }

    get hasPositionalParameters(): boolean {
        return this.positionalParameters.length !== 0;
    }

    get hasOptionalParameters(): boolean {
        return this.hasNamedParameters || this.hasPositionalParameters;
    }

    getRequiredParameters(): Parameter[] {
        const parameters: Parameter[] = [];
        const params = this.requiredParameters;

        if (params.length === 0) return parameters;

        for (const param of params) {
            const parameter = this.encode(param, 'required');
            parameters.push(parameter);
        }

        return parameters;
    }

    getNamedParameters(): Parameter[] {
        const parameters: Parameter[] = [];
        const params = this.namedParameters;

        if (params.length === 0) return parameters;

        for (const param of params) {
            const parameter = this.encode(param, 'named');
            parameters.push(parameter);
        }

        return parameters;
    }

    getPositionalParameters(): Parameter[] {
        const parameters: Parameter[] = [];
        const params = this.positionalParameters;

        if (params.length === 0) return parameters;

        for (const param of params) {
            const parameter = this.encode(param, 'positional');
            parameters.push(parameter);
        }

        return parameters;
    }

    getParameters(): Parameter[] {
        return [
            ...this.getRequiredParameters(),
            ...this.getNamedParameters(),
            ...this.getPositionalParameters(),
        ];
    }
}
