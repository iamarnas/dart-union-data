import { fromMapItemActionValue } from '../generators';
import { RefactorProperties } from '../interface';
import { Parameter } from '../models/parameter';
import '../types/string';
import { buildString, findCodeBlock, regexp } from '../utils';

/**
 * A class utility for reorganizing an existing and unknown map string expression by adding and removing parameters.
 */
export class FromMapRefactor implements RefactorProperties {
    private _value: string;

    constructor(input: string) {
        this._value = input;
    }

    get parameters(): string[] {
        return extractFromMapParameters(this._value);
    }

    get lenght(): number {
        return this._value.length;
    }

    get isBlockBody(): boolean {
        return this._value.search(/(?<=\n)\s*return /) !== -1;
    }

    get hasComments(): boolean {
        return regexp.comment.test(this._value);
    }

    get value(): string {
        return this._value;
    }

    get mapName(): string {
        return (/\(\s*Map<String, dynamic>(.*)\)/).exec(this._value)?.at(1)?.trim() ?? 'map';
    }

    get isMapNameChanged(): boolean {
        return this.parameters.some((e) => e.indexOf(this.mapName + '[') === -1);
    }

    get isPure(): boolean {
        const method = new FromMapRefactor(this._value).delete(...this.parameters).value;
        const from = method.search(/=>|return/);
        const start = method.indexOf('(', from) + 1;
        const end = method.indexOf(')', from);
        return method.slice(start, end).trim().length === 0;
    }

    insert(...parameters: string[]): this;
    insert(...parameters: Parameter[]): this;
    insert(...parameters: unknown[]): this {
        const isStringArray = parameters.every((e) => typeof e === 'string');
        const isParameterArray = parameters.every((e) => e instanceof Parameter);
        let params: string[] = [];
        const copy = this._value;

        if (isStringArray) {
            params = parameters as string[];
        }

        if (isParameterArray) {
            const filtered = [...parameters as Parameter[]].filter((p) => !this.parameters.some((e) => p.hasMapKeyMatch(e)));
            params = filtered.map((p) => fromMapItemActionValue(p).value);
        }

        if (!params.length) return this;

        const lastParameter = this.parameters[this.parameters.length - 1];
        const search = regexp.join(/(?<=[(,:])\s*/, lastParameter);
        const defaultPosition = copy.indexesOf(search).at(0)?.at(1);

        if (!defaultPosition) {
            console.warn('Could not read the last parameters end position to insert in the FromMapRefactor');
            return this;
        }

        const insertions = buildString((sb) => sb.writeBlock(params));
        this._value = copy.insertAt(defaultPosition, insertions);

        return this;
    }

    delete(...parameters: string[]): this;
    delete(...parameters: Parameter[]): this;
    delete(...parameters: unknown[]): this {
        const isStringArray = parameters.every((e) => typeof e === 'string');
        const isParameterArray = parameters.every((e) => e instanceof Parameter);
        let removals: string[] = [];
        let copy = this._value;

        if (isStringArray) {
            removals = parameters as string[];
        }

        if (isParameterArray) {
            removals = this.parameters.filter((e) => ![...parameters as Parameter[]].some((p) => p.hasMapKeyMatch(e)));
        }

        if (!removals.length) return this;

        for (const item of removals) {
            const search = regexp.join(/\s*/, item);
            copy = copy.replace(search, '');
        }

        this._value = copy;

        return this;
    }

    watch(...parameters: Parameter[]): this {
        const mapNameMatch = /(?<=\s|:|\()[a-z_$]+\w\[/g;
        this.delete(...parameters);
        this.insert(...parameters);

        for (const p of parameters) {
            const nameMatch = regexp.join(/(?<=\(|\s)/, p.name, /\s*:\s*/);
            const hasName = this.parameters.find((e) => nameMatch.test(e)) !== undefined;

            if (!p.isNamed && hasName) {
                console.log('1', p.name, p.isNamed);
                //this._value = this._value.replace(nameMatch, '');
            }

            if (p.isNamed && !hasName) {
                const paramMatch = regexp.join(/(?<=\s|:|\()[a-z_$(]+\w\[["']/, p.mapKey, /["']\]/);
                const start = paramMatch.exec(this._value)?.index;

                if (start !== undefined) {
                    console.log('2', p.name, p.isNamed);
                    // this._value = this._value.insertAt(start, p.name + ': ');
                }
            }
        }

        if (this.isMapNameChanged) {
            this._value = this._value.replace(mapNameMatch, this.mapName + '[');
        }

        return this;
    }
}

function extractFromMapParameters(code: string): string[] {
    const params: string[] = [];
    const split = code.split('\n');
    const map = /\s*[a-z_$]+\w\[.+\]/;
    const onlyName = /^\s*[a-z_$]+\w:\s*$/;
    const namedParam = regexp.join(/(?<=:)/, map);
    const unnamedParam = regexp.join(/^\s*/, map);
    const namedCollection = regexp.join(/(?<=:)\s*\(/, map);
    const unnamedCollection = regexp.join(/^\s*\(/, map);

    for (const line of split) {
        const endsWithComma = line.trimEnd().endsWith(',');
        const endsWithNull = line.trimEnd().endsWith('null');

        if (regexp.startOfComment.test(line)) continue;

        if ((namedParam.test(line) || unnamedParam.test(line)) && endsWithComma) {
            params.push(line);
        }

        if (onlyName.test(line)) {
            const body = code.slice(code.indexOf(line));
            params.push(body.endsWithLine((line) => line.trimEnd().endsWith(',')));
        }

        if ((namedParam.test(line) || unnamedParam.test(line)) && endsWithNull) {
            const body = code.slice(code.indexOf(line));
            params.push(body.endsWithLine((line) => line.trimEnd().endsWith(',')));
        }

        if (namedCollection.test(line) || unnamedCollection.test(line)) {
            params.push(findCodeBlock(code.slice(code.indexOf(line))));
        }
    }

    return params;
}