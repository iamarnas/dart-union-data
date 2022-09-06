import { GenericType, GenericTypeElement } from '../interface';
import '../types/string';

/** 
 * @param input the string that contains the generic type.
 */
export class GenericTypeTemplate implements GenericTypeElement {
    types: GenericType[] = [];

    /**
     * The full generic type with extended types.
     * @example <T extends Object?>
     */
    displayType = '';

    constructor(input: string) {
        this.types = GenericType.types(input);
        this.displayType = GenericType.displayType(input);
    }

    get hasData(): boolean {
        return this.types.length !== 0;
    }

    /** 
     * The generic type without extended types.
     * @example <T, E>
     */
    get type(): string {
        if (!this.hasData) return '';
        const types = this.types.map((e) => e.type).join(', ');
        return `<${types}>`;
    }

    /**
     * @example '<$T, $E>'
     * @returns a string:
     */
    typeString(): string {
        if (!this.hasData) return '';
        const types = this.types.map((e) => `$${e.type}`);
        return `<${types.join(', ')}>`;
    }
}