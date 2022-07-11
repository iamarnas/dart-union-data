interface Array<T> {
    /**
     * Returns the item located at the specified index.
     * @param {number} index The zero-based index of the desired code unit. A negative index will count back from the last item.
     */
    at(index: number): T | undefined;

    /**
     * Removes and returns the first object in this array.
     * If the array is empty, undefined is returned and the array is not modified.
     * 
     * Alternatively, you can use `shift()`
     */
    removeFirst(): T | undefined;

    /**
     * Removes and returns the last object in this array.
     * If the array is empty, undefined is returned and the array is not modified.
     * 
     * Alternatively, you can use `pop()`
     */
    removeLast(): T | undefined;

    /**
     * Convenience function to check that the array is not empty.
     */
    isNotEmpty(): boolean;

    /** 
     * Convenience function to check that the array is empty.
     */
    isEmpty(): boolean;

    /**
     * Inserts objects at the specified index.
     * @param index indicates where the object is to be inserted.
     * @param items an object to insert.
     */
    insertAt<T>(index: number, ...items: T[]): T[];
}

interface ReadonlyArray<T> {
    /**
     * Returns the item located at the specified index.
     * @param {number} index The zero-based index of the desired code unit. A negative index will count back from the last item.
     */
    at(index: number): T | undefined;

    /**
     * Convenience function to check that the array is not empty.
     */
    isNotEmpty(): boolean;

    /** 
     * Convenience function to check that the array is empty.
     */
    isEmpty(): boolean;
}

interface String {
    /**
     * Return the length of matched characters.
     */
    lengthOf(symbol: string): number;

    /**
     * The `decapitalize()` method returns a string where the first character is lower case.
     */
    decapitalize(): string;

    /**
     * The `capitalize()` method returns a string where the first character is upper case.
     */
    capitalize(): string;

    /** 
     * Convenience function to check that the string is blank.
     */
    isBlank(): boolean;

    /** 
     * Convenience function to check that the string not blank.
     */
    isNotBlank(): boolean;

    /**
     * Inserts string elements at the specified index or string value.
     * @param from indicates where the string object is to be inserted.
     * @param replacement an string objects to insert.
     */
    insertAt(from: number | string, replacement: string): string;

    /**
     * Returns the substring range from the given `start` and `end` index.
     * If the `end` index is not provided, the returns range after the `start´ index.
     * @param start indicates the start of the range.
     * @param end indicates the end of the range.
     * @param between returns everything between the `start` and `end` indices. **Note:** works only if indexes are strings.
     */
    getRange(start: number | string, end?: number | string, between?: boolean): string;

    /**
     * Returns `true` if one of the items are included in one string. Otherwise `false`.
     * @param items list of items to search for.
     */
    includesOne(...items: string[]): boolean;

    /**
     * Returns `true` if all of the items are included in one string. Otherwise `false`.
     * @param items list of items to search for.
     */
    includesAll(...items: string[]): boolean;

    /**
     * Splits the string only in the specified range.
     * @param separator a symbol indicating where to split.
     * @param from the symbol from where the separator is ignored.
     * @param to a symbol that indicates the end of the ignore range.
     */
    splitWhere(separator: string, from: string, to: string): string[];
}

interface Map<K, V> {
    /**
     * Convenience function to check that the map is not empty.
     */
    isNotEmpty(): boolean;

    /** 
     * Convenience function to check that the map is empty.
     */
    isEmpty(): boolean;

    /** 
     * Convenience function to filter map entry.
     */
    where(cb: (key: K, value: V) => boolean): Map<K, V>;

    /** 
     * Convenience function to filter map entry by key.
     */
    whereKey(cb: (key: K) => boolean): Map<K, V>;

    /** 
     * Convenience function to filter map entry by values.
     */
    whereValue(cb: (value: V) => boolean): Map<K, V>;
}