interface StringSink {
    /**
     * Writes the string representation of [object].
     * 
     * Converts [object] to a string.
     */
    write(object: unknown): void;

    /**
     * Iterates over the given objects and writes them in sequence. 
     * @param objects which will be written in block.
     * @param {string} separator the default separator is `""`
     * @param {number} tabs adds tab before object.
     */
    writeAll(objects: unknown[], separator?: string, tabs?: number): void;

    /**
     * Iterates over the given objects and writes them in the new line as a block.
     * @param objects which will be written in block.
     * @param {string} suffix additional decoration after the object. 
     * @param {number} tabs adds tab before object.
     */
    writeBlock(objects: unknown[], suffix: string, tabs?: number): void

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
export default class StringBuffer implements StringSink {
    constructor(private content = '') { }

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
        return this.content === '';
    }

    /**
     * Convenience getter to determine whether the current content is not empty.
     */
    get isNotEmpty(): boolean {
        return !this.isEmpty;
    }

    write(object: unknown, tabs?: number): void {
        if (typeof object === 'object') {
            const obj = JSON.stringify(object);
            this.content = this.content.concat(`${this.addTabs(tabs)}${obj}`);
        } else {
            this.content = this.content.concat(`${this.addTabs(tabs)}${object}`);
        }
    }

    writeAll(objects: unknown[], separator = '', tabs?: number): void {
        this.write(objects.map((e) => `${this.addTabs(tabs)}${e}`).join(separator));
    }

    writeBlock(objects: unknown[], suffix = '', tabs?: number): void {
        for (const object of objects) {
            this.writeln(`${object}${suffix}`, tabs);
        }
    }

    writeln(object?: unknown, tabs?: number): void {
        if (!object) {
            this.write('\n');
        } else {
            this.write('\n');
            this.write(`${object}`, tabs);
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

    /**
     * Returns the number of tabs according to the specified number.
     * @param tabs a number that indicates the length of the tabs.
     * @returns string of tabs.
     */
    private addTabs(tabs = 0): string {
        return [...Array(tabs)].map(() => '\t').join('');
    }
}
