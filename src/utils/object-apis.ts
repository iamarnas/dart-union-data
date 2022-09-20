
function deepEqual(object1: any, object2: any): boolean {
    if (!isObject(object1) || !isObject(object2)) {
        return JSON.stringify(object1) === JSON.stringify(object2);
    }

    const keys1 = Object.keys(object1);
    const keys2 = Object.keys(object2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
        const val1 = object1[key];
        const val2 = object2[key];
        const areObjects = isObject(val1) && isObject(val2);

        if (areObjects && !deepEqual(val1, val2) || !areObjects && val1 !== val2) {
            return false;
        }
    }

    return true;
}

function isObject(object: any) {
    return object !== null && typeof object === 'object';
}

/**
 * Pair objects `undefined` mean the end of the value of the array
 * @example 
 * // from
 * const arr = [1, 2, 3, 4];
 * // output: [[1, 2], [2, 3], [3, 4], [4, undefined]]
 */
function pairObjects<T>(v: T, i: number, arr: T[]): [T, T | undefined] {
    if (i % 2 === 0) return [arr[i], arr[i + 1]];
    return [arr[i], arr[i + 1]];
}

export { deepEqual, pairObjects };

