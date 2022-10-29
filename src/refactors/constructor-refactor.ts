import { RefactorProperties } from '../interface';
import { Parameter } from '../models/parameter';
import '../types/string';
import { regexp } from '../utils';

/**
 * A class utility for reorganizing an existing constructor string expression by adding and removing parameters.
 */
export class ConstructorRefactor implements RefactorProperties {
    private _value: string;

    constructor(input: string) {
        this._value = input;
    }

    get isValid(): boolean {
        return validateConstructor(this._value);
    }

    get parameters(): string[] {
        return extractConstructorParameters(this.value);
    }

    get lenght(): number {
        return this.value.length;
    }

    get isBlockBody(): boolean {
        return this.parameters.some((e) => regexp.join(/(?<=\n)\s*/, e, /\s*,/).test(this._value));
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

    /**
     * Insert not existing parameter. To insert the specified parameter must not match formal constructor parameters.
     * @param parameters that will be inserted.
     */
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
            const prefix = this.isBlockBody ? '\t\t' : '';
            const filtered = [...parameters as Parameter[]].filter((p) => !this.parameters.some((e) => p.maybeGenerated(e)));
            params = filtered.map((e) => prefix + e.expression('this')).filter(Boolean);
        }

        if (!params.length) return this;

        const optional = (/(?<=[,(])\s*(\{.*(?<=\S)(\s*)\}|\[.*(?<=\S)(\s*)\])\s*(?=\))/s).exec(this._value);
        const constr = (/\(.*(?<=\S)(\s*)\)\s*(?=;|:|$)/s).exec(this._value);
        const indeces = [...regexp.indices(optional).slice(2), regexp.indices(constr).at(1)];
        const index = indeces.filter(Boolean).at(0)?.at(0);
        const isBeforeComment = (/\/.*$/).test(this._value.slice(0, index));
        const isBeforeNewLine = (/.*\n/).test(this._value.slice(index));
        const isBeforeComma = (/,\s*$/).test(this._value.slice(0, index));
        const comma = isBeforeComment || isBeforeComma ? '' : ', ';
        const suffix = this.isBlockBody && !isBeforeNewLine ? ',\n' : ',';
        const insertion = this.isBlockBody
            ? `${comma.trimEnd()}\n${params.join(',\n')}${suffix}`
            : `${comma}${params.join(', ')}`;

        if (!index || !Boolean(insertion)) return this;

        this._value = this._value.insertAt(index, insertion);

        return this;
    }

    /**
     * Delete existing parameters. To delete the specified parameter must match formal constructor parameters.
     * @param parameters that will be deleted.
     */
    delete(...parameters: string[]): this;
    delete(...parameters: Parameter[]): this;
    delete(...parameters: unknown[]): this {
        const isStringArray = parameters.every((e) => typeof e === 'string');
        const isParameterArray = parameters.every((e) => e instanceof Parameter);
        let params: string[] = [];
        let copy = this._value;

        if (isStringArray) {
            params = parameters as string[];
        }

        if (isParameterArray) {
            params = this.parameters.filter((e) => ![...parameters as Parameter[]].some((p) => p.maybeGenerated(e)));
        }

        if (!params.length) return this;

        const mateches = params.filter(Boolean).map((e) => regexp.join(/\s*/, e, /(\s*,|(?=[\s\n}\])]))/));

        if (regexp.comment.test(copy)) {
            const filtered = copy.split('\n').filter((line) => regexp.startOfComment.test(line) || !mateches.some((m) => m.test(line)));
            this._value = filtered.join('\n');
            return this;
        }

        mateches.forEach((m) => copy = copy.replace(m, ''));
        this._value = copy;

        return this;
    }

    /**
     * A method that will generate a new instance according to the specified parameters.
     * @param parameters that will be monitored.
     * @returns new instance of {@link ConstructorRefactor}
     */
    watch(...parameters: Parameter[]): this {
        const epmtyBrackets = /(?<=[,(])\s*(\[\s*\]|{\s*})\s*(?=\))/;

        this.insert(...parameters);
        this.delete(...parameters);

        if (!parameters.length && epmtyBrackets.test(this._value)) {
            this._value = this._value.replace(epmtyBrackets, '');
        }

        return this;
    }
}

function formatConstructor(input: string): string {
    const hasComments = input.match(regexp.comment) !== null;
    const parameters = extractConstructorParameters(input);
    const isBlockFormated = isBlockBodyFormated(input);
    const line = convertToExpressionBody(input);
    const isOneLineLenght = line.length <= 78;

    if (!parameters.length) {
        return input.slice(0, input.indexOf('(') + 1) + ')';
    }

    if (!hasComments && isOneLineLenght) return line;
    if (isBlockFormated) return input;

    return convertToBlockBody(input, parameters);
}

function extractConstructorParameters(input: string): string[] {
    const withoutComments = input.replace(regexp.comment, '');
    const body = (/\((.*)\)/s).exec(withoutComments);

    if (!body) {
        console.error(`Error. Returned empty array because input did not contain constructor closing parentheses (). Input: ${input}`);
        return [];
    }

    const content = body[1]
        .replace(/^\s*[{[]/, '')
        .replace(/,\s*[{[]/g, ',')
        .replace(/(?<=[\]},\w'"])\s*[\]}]/, '');

    const result = content.split(',')
        .map((e) => e.includes('const') ? e.slice(0, e.search(/[\]})]/) + 1).trim() : e.trim())
        // Try to clean up array elements due to invalid input.
        .filter((e) => !(/^(\s*|\W+)$/).test(e));

    return result;
}

function convertToBlockBody(input: string, parameters?: string[]): string {
    const hasComments = input.match(regexp.comment) !== null;
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

const isBlockBodyFormated = (input: string): boolean => {
    const split = input.trimEnd().split('\n');
    const a = (/^\s{2}[a-zA-Z_$]/).test(split.at(0) ?? '');
    const b = (/^\s{2}[\]})]/).test(split.at(-1) ?? '');
    const c = split.slice(1, -1).every((line) => (/^\s{4}[a-zA-Z_$]/).test(line));

    return a && b && c;
};

const validateConstructor = (input: string): boolean => {
    const a = input.lengthOf('(') === input.lengthOf(')') && input.lengthOf('(') !== 0;
    const b = input.lengthOf('{') === input.lengthOf('}');
    const c = input.lengthOf('[') === input.lengthOf(']');

    if (input.match('{') !== null && input.match('[') !== null) {
        return a && b && c;
    }

    if (input.match('{') !== null) {
        return a && b;
    }

    if (input.match('[') !== null) {
        return a && c;
    }

    return a;
};
