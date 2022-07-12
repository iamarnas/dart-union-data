import { ParameterExpression } from '../codecs/parameter-codec';
import { Parameter } from '../models/parameter';
import { ParameterConverter } from '../models/parameter-converter';
import '../types/array';
import '../types/string';
import { deepEqual, regexp } from '../utils';

/**
 * A type that requires a parameter name to use for {@link ParametersTemplate.buffer buffer} key names.
 */
type BufferParameter = Pick<Parameter, 'name'> & Partial<Omit<Parameter, 'name'>>;

export class ParametersTemplate {
    private buffer = new Map<string, Parameter>();

    constructor(private readonly converter: ParameterConverter) {
        for (const param of converter.getParameters()) {
            this.buffer.set(param.name, param);
        }
    }

    /**
     * Converts parameters from given string.
     * - **Note:** `input` must contain a constructor (...) to determine parameters range.
     * @param input the string that contains the constructor.
     * @returns this {@link ParametersTemplate}
     */
    static from(input: string): ParametersTemplate {
        const converter = new ParameterConverter(input);
        return new ParametersTemplate(converter);
    }

    /**
     * Checks if the parameter is in the buffer
     * @param name the name of parameter
     * @returns boolean
     */
    has(name: string): boolean {
        return this.buffer.has(name);
    }

    /**
     * Get parameter from the buffer by parameter name.
     * @param name a parameter name.
     * @returns `undefined` if not found, otherwise {@link Parameter}
     */
    get(name: string): Parameter | undefined {
        return this.buffer.get(name);
    }

    get size(): number {
        return this.buffer.size;
    }

    asMap(): Map<string, Parameter> {
        return this.buffer;
    }

    get all(): Parameter[] {
        return [...this.buffer.values()];
    }

    get optionalPositional(): Parameter[] {
        return this.all.filter((e) => e.isPositional);
    }

    get optionalNamed(): Parameter[] {
        return this.all.filter((e) => e.isNamed);
    }

    get required(): Parameter[] {
        return this.all.filter((e) => !e.isOptional);
    }

    get superParameters(): Parameter[] {
        return this.all.filter((e) => e.isSuper);
    }

    get getters(): Parameter[] {
        return this.all.filter((e) => e.isGetter);
    }

    get hasRequiredParameters(): boolean {
        return this.required.length !== 0;
    }

    get hasPositionalParameters(): boolean {
        return this.optionalPositional.length !== 0;
    }

    get hasNamedParameters(): boolean {
        return this.optionalNamed.length !== 0;
    }

    get hasOptionalParameters(): boolean {
        return this.hasNamedParameters || this.hasPositionalParameters;
    }

    get isEmpty(): boolean {
        return this.size === 0;
    }

    get isNotEmpty(): boolean {
        return !this.isEmpty;
    }

    /**
     * Include details from the initialized variable.
     * @param parameters a list of parameters to need be initialize.
     * @returns [ParametersTemplate] with new data.
     */
    included(...parameters: Parameter[]): this {
        if (parameters.length === 0) return this;
        // Add and sort nullable and not declared getters.
        for (const other of parameters) {
            const isEnum = /^[^a-z0-9][A-z]\w+\.\w+$/;
            // Get instance variable with constructors formal parameter name.
            const parameter = this.get(other.name);

            if (deepEqual(parameter, other)) continue;

            if (parameter) {
                // Required parameters details after initialize.
                const { value, defaultValue, isOptional, isNamed, isPositional, isRequired, isInitialized } = other;
                // Some parameters, such as in the constructor, have no type 
                // and not initialized fields have no parameter details.
                // Obs: only copy with missing details from the initialize parameter to non-initialized parameters.
                if (!parameter.isInitialized && other.isInitialized) {
                    this.set(parameter.copyWith({
                        isOptional: isOptional,
                        isNamed: isNamed,
                        isPositional: isPositional,
                        value: value,
                        defaultValue: defaultValue,
                        isRequired: isRequired,
                        isInitialized: isInitialized,
                        // Detect enum from the default value if the enum was not marked with a comment.
                        isEnum: !parameter.isEnum ? isEnum.test(defaultValue) : parameter.isEnum,
                    }));
                }
            }
        }

        return this;
    }

    /**
     * Returns method parameter expression. Otherwise empty list if expression not declared.
     * @param expression a method parameter expression.
     * @returns string array of all parameters expression.
     */
    expressionsOf(expression?: ParameterExpression): string[] {
        if (!expression) return [];
        return this.all.map((e) => e.expression(expression));
    }

    /**
     * {@link BufferParameter} are based on {@link Parameter} 
     * where the parameter `name` is required to identify elements in the buffer.
     * @param parameters to set a new one or update existing ones.
     */
    set(...parameters: BufferParameter[]) {
        for (const param of parameters) {
            this.buffer.set(param.name, param as Parameter);
        }
    }

    /**
     * The method is similar to {@link set} but before set, clears the buffer and adds a new content.
     * @param parameters to replace all in the buffer with new ones.
     * @returns this {@link ParametersTemplate}
     */
    replaceWith(...parameters: BufferParameter[]): this {
        this.clear();
        this.set(...parameters);
        return this;
    }

    clear() {
        this.buffer.clear();
    }

    asSuper(): this {
        for (const [key, value] of this.buffer) {
            this.buffer.set(key, value.copyWith({ isSuper: true }));
        }
        return this;
    }

    asEnum(): this {
        for (const [key, value] of this.buffer) {
            this.buffer.set(key, value.copyWith({ isEnum: true }));
        }
        return this;
    }

    asGetters(): this {
        for (const [key, value] of this.buffer) {
            this.buffer.set(key, value.copyWith({ isGetter: true }));
        }
        return this;
    }

    asOptionalNamed(): this {
        for (const [key, value] of this.buffer) {
            this.buffer.set(key, value.copyWith({ isOptional: true, isNamed: true }));
        }
        return this;
    }

    /**
     * Marks every parameter as initialized
     * @returns this {@link ParametersTemplate}
     */
    initialize(): this {
        for (const [key, value] of this.buffer) {
            this.buffer.set(key, value.copyWith({ isInitialized: true }));
        }
        return this;
    }
}

/**
 * Checks if a given string has a constructor.
 * @param {string} input a string having the constructor.
 * @returns `true` if a given string has a constructor.
 */
export function hasConstructor(input: string): boolean {
    return regexp.constructorMatch.test(input);
}
