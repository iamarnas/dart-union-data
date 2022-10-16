import { RefactorProperties } from '../interface';
import { Parameter } from '../models/parameter';
import { regexp } from '../utils';

/**
 * A class utility for reorganizing an existing constructor string expression by adding and removing parameters
 * and keep saving the current code syntax.
 */
export class ConstructorRefactor implements RefactorProperties {
    private _value: string;

    constructor(input: string) {
        this._value = input;
    }

    get parameters(): string[] {
        return extractConstructorParameters(this.value);
    }

    get lenght(): number {
        return this.value.length;
    }

    get isBlock(): boolean {
        return isBlockBody(this.value, this.parameters);
    }

    get hasComments(): boolean {
        return regexp.comment.test(this.value);
    }

    get value(): string {
        return this._value;
    }

    format(): this {
        this._value = formatConstructor(this._value);
        return this;
    }

    insert(...parameters: string[]): this;
    insert(...parameters: Parameter[]): this;
    insert(...parameters: unknown[]): this {
        const isStringArray = parameters.every((e) => typeof e === 'string');
        const isParameterArray = parameters.every((e) => (e instanceof Parameter) === true);
        let params: string[] = [];

        if (isStringArray) {
            params = parameters as string[];
        }

        if (isParameterArray) {
            const prefix = this.isBlock ? '\t\t' : '';
            params = [...parameters as Parameter[]].map((e) => prefix + e.expression('this'));
        }

        if (!params.length) return this;

        const lastParameter = this.parameters[this.parameters.length - 1];
        const search = regexp.join(/(?<=[,[{(\n])\s*/, lastParameter, /\s*(?=[,\]})])/);
        const comma = !parameters.length ? '' : this.isBlock ? ',\n' : ', ';
        const [_, end] = this._value.indexesOf(search).at(0) ?? [];

        if (!end) return this;

        this._value = this._value.insertAt(end, comma + params.join(', '));

        return this;
    }

    delete(...parameters: string[]): this;
    delete(...parameters: Parameter[]): this;
    delete(...parameters: unknown[]): this {
        const isStringArray = parameters.every((e) => typeof e === 'string');
        const isParameterArray = parameters.every((e) => e instanceof Parameter);
        const epmtyBrackets = /(?<=[,(])\s*(\[\s*\]|{\s*})\s*(?=\))/;
        let removals: string[] = [];
        let value = this._value;

        if (isStringArray) {
            removals = parameters as string[];
        }

        if (isParameterArray) {
            removals = this.parameters.filter((e) => ![...parameters as Parameter[]].some((p) => p.maybeGenerated(e)));
        }

        if (!removals.length) return this;

        for (const item of removals) {
            const search = regexp.join(/\s*/, item, /(\s*,\s*|\s*(?=]|}|\)))/);
            const hasComments = regexp.comment.test(value);

            if (hasComments) {
                value = value.split('\n').map((line) => {
                    if (regexp.startOfComment.test(line)) return line;
                    return line.replace(search, '');
                }).filter(Boolean).join('\n');
            } else {
                value = value.replace(search, '');
            }
        }

        this._value = value.replace(epmtyBrackets, '');

        return this;
    }

    watch(...parameters: Parameter[]): this {
        const deletions = this.parameters.filter((e) => !parameters.some((p) => p.maybeGenerated(e)));
        const insertions = parameters.filter((p) => !this.parameters.some((e) => p.maybeGenerated(e)));
        deletions.forEach((item) => this.delete(item));
        insertions.forEach((item) => this.insert(item));
        return this;
    }
}

function formatConstructor(input: string): string {
    const hasComments = regexp.comment.test(input);
    const parameters = extractConstructorParameters(input);
    const isFormated = isBlockBodyFormated(input, parameters);
    const line = convertToExpressionBody(input);

    if (!parameters.length) {
        return input.slice(0, input.indexOf('(') + 1) + ')';
    }

    if (!hasComments && line.length <= 77) return line;
    if (!hasComments && line.length > 77 && isFormated) return input;

    return convertToBlockBody(input, parameters);
}

function extractConstructorParameters(input: string): string[] {
    const withoutComments = input.replace(regexp.comment, '');
    const body = (/\((.*)\)/s).exec(withoutComments);

    if (!body) {
        console.error(`Error. Returned empty array because input did not contain constructor closing parentheses (). Input: ${input}`);
        return [];
    }

    const content = body[1].replace(/\s*\/.*/g, '')
        .replace(/^\s*[{[]/, '')
        .replace(/,\s*[{[]/g, ',')
        .replace(/(?<=[\]},\w'"])\s*[\]}]/, '');

    return content.split(',')
        .map((e) => e.includes('const') ? e.slice(0, e.search(/[\]})]/) + 1).trim() : e.trim())
        .filter(Boolean);
}

function convertToBlockBody(input: string, parameters?: string[]): string {
    const hasComments = regexp.comment.test(input);
    const params = parameters ?? extractConstructorParameters(input);
    const last = params.at(-1);

    if (!last) return convertToExpressionBody(input);

    let sb = input;

    params.forEach((item) => {
        const search = regexp.join(/\s*/, item, /(\s*,\s*|\s*(?=]|}|\)))/);
        const comma = item !== last ? ',\n\t\t' : ',\n\t';

        if (hasComments) {
            sb = sb.split('\n').map((line) => {
                if (regexp.startOfComment.test(line)) {
                    return line.replace(/^\s*/, '\t\t').trimEnd();
                }

                return line.replace(search, '\n\t\t' + item + ', ').trimEnd();
            }).filter(Boolean).join('\n');
        } else {
            sb = sb.replace(search, '\n\t\t' + item + comma);
        }
    });

    sb = sb
        .replace(/(?<=,)\s*(?=[{[])/g, ' ')
        .replace(/\n\s*\n/g, '\n');

    return sb;
}

function convertToExpressionBody(input: string): string {
    return input.replace(regexp.comment, '')
        .replace(/\s*\n\s*/g, '')
        .replace(/,\s*/g, ', ')
        .replace(/(,\s*|(?<=[^{([])\s*)(?=[}\])])/, '');
}

const isBlockBody = (input: string, parameters?: string[]): boolean => {
    const params = parameters ?? extractConstructorParameters(input);
    return params.some((item) => regexp.join(/(?<=\n)\s*/, item, /\s*,/).test(input));
};

const isBlockBodyFormated = (input: string, parameters?: string[]): boolean => {
    const params = parameters ?? extractConstructorParameters(input);
    return params.every((item) => regexp.join(/(?<=\n)\s*/, item, /(\s*,\s*\n|\s*,\s*\/.*\n)/).test(input));
};
