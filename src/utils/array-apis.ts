declare global {
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
    }
}

Array.prototype.at = function <T>(index: number): T | undefined {
    if (index < 0) {
        const i = this.length - (index * -1);
        return this[i] as T;
    }
    return this[index] as T;
};

Array.prototype.removeFirst = function <T>(): T | undefined {
    return this.shift() as T;
};

Array.prototype.removeLast = function <T>(): T | undefined {
    return this.pop() as T;
};

export { };
