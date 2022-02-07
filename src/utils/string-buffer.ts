export interface StringOptions {
    tabs?: number,
    prefix?: string,
    suffix?: string,
}

interface StringSink {
    /**
     * Writes the string representation of [object].
     * 
     * Converts [object] to a string.
     */
    write(object?: unknown): void;

    /**
     * Iterates over the given [objects] and [write]s them in sequence. 
     * @param objects which will be written in sequence.
     * @param separator the default separator is `""`
     * @param options adds more options from the [StringOptions] to the printed value.
     */
    writeAll(objects: unknown[], separator?: string, options?: StringOptions): void;

    /**
     * 
     * Writes [object] followed by a newline, `"\n"`.
     * 
     * Calling `writeln()` will write the `"\n"` string before the newline.
     */
    writeln(object?: unknown): void;
}

/**
 * A class for concatenating strings efficiently.
 * 
 * Allows for the incremental building of a string using `write*()` methods.
 * The strings are concatenated to a single string only when `toString` is called.
 */
export class StringBuffer implements StringSink {
    /** 
     * Output content.
     * 
     * Returns final result of the string.
     */
    private content: string;

    constructor(content = '') {
        this.content = content;
    }

    /**
     * Specifies the length of the content.
     */
    get length(): number {
        return this.content.length;
    }

    /**
     * Convenience getter to determine whether the current content is empty.
     */
    get isEmpty(): boolean {
        return this.length === 0;
    }

    /**
     * Convenience getter to determine whether the current content is not empty.
     */
    get isNotEmpty(): boolean {
        return !this.isEmpty;
    }

    write(object?: unknown): void {
        this.content += `${object}`;
    }

    writeAll(objects: unknown[], separator = '', options?: StringOptions): void {
        const tabs = options?.tabs;
        const prefix = options?.prefix ?? '';
        const suffix = options?.suffix ?? '';
        const object = (e: unknown): string => `${addTabs(tabs)}${prefix}${e}${suffix}`;
        this.content += objects.map(object).join(separator);
    }

    writeln(object?: unknown): void {
        if (object) {
            this.content += `\n${object}`;
        } else {
            this.content += '\n';
        }
    }

    /**
     * Convenience function to add tabs `"\t"` to the content.
     * @param tabs represent how many tabs will be added.
     */
    writeTab(tabs?: number): void {
        this.content += addTabs(tabs);
    }

    /**
     * Cleans buffer content.
     */
    clean(): void {
        this.content = '';
    }

    /**
     * Returns the contents of buffer as a single string.
     */
    toString(): string {
        return this.content;
    }
}

function addTabs(tabs?: number): string {
    if (!tabs) { return ''; }

    let sb = '';
    let i = 0;

    while (i < tabs) {
        sb += '\t';
        i++;
    }

    return sb;
}
