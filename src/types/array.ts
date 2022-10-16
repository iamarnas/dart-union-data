Array.prototype.removeFirst = function <T>(): T | undefined {
    return this.shift() as T;
};

Array.prototype.removeLast = function <T>(): T | undefined {
    return this.pop() as T;
};

Array.prototype.isNotEmpty = function (): boolean {
    return !this.isEmpty();
};

Array.prototype.isEmpty = function (): boolean {
    return this.length === 0;
};

Array.prototype.insertAt = function <T>(index: number, ...items: T[]): T[] {
    this.splice(index, 0, ...items);
    return this;
};