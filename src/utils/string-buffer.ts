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
     * @param tabs adds tab before value.
     */
    writeAll(objects: unknown[], separator?: string, tabs?: number): void;

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

    write(object?: unknown, tabs?: number): void {
        this.content += `${addTabs(tabs)}${object}`;
    }

    writeAll(objects: unknown[], separator = '', tabs?: number): void {
        const object = (e: unknown): string => `${addTabs(tabs)}${e}`;
        this.content += objects.map(object).join(separator);
    }

    writeln(object?: unknown, tabs?: number): void {
        if (object) {
            this.content += `\n${addTabs(tabs)}${object}`;
        } else {
            this.content += '\n';
        }
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
