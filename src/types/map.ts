Map.prototype.where = function <K, V>(cb: (key: K, value: V) => boolean): Map<K, V> {
    return new Map([...this.entries()].filter(([k, v]) => cb(k, v))) as Map<K, V>;
};

Map.prototype.whereKey = function <K, V>(cb: (key: K) => boolean): Map<K, V> {
    return new Map([...this.entries()].filter(([k, _]) => cb(k))) as Map<K, V>;
};

Map.prototype.whereValue = function <K, V>(cb: (value: V) => boolean): Map<K, V> {
    return new Map([...this.entries()].filter(([_, v]) => cb(v))) as Map<K, V>;
};

Map.prototype.isEmpty = function (): boolean {
    return this.size === 0;
};

Map.prototype.isNotEmpty = function (): boolean {
    return !this.isEmpty();
};