import * as assert from 'assert';
import { it } from 'mocha';
import '../../../types/array';

suite('Array Types Test Suite', () => {
    it('should pass empty or not empty', () => {
        assert.strictEqual([].isEmpty(), true, 'should return true if empty');
        assert.strictEqual(['a'].isNotEmpty(), true, 'should return true if non empty');
    });

    it('should pass method `at`', () => {
        assert.strictEqual(['a', 'b', 'c'].at(2), 'c', 'should return "c"');
        assert.strictEqual(['a', 'b', 'c'].at(-1), 'c', 'should return "c"');
        assert.strictEqual(['a', 'b', 'c'].at(3), undefined, 'should return undefined');
    });

    it('should pass remove first and remove last', () => {
        const arr = ['a', 'b', 'c'];
        assert.deepStrictEqual(arr, ['a', 'b', 'c'], 'should match the initial before the modification');
        assert.strictEqual(arr.removeFirst(), 'a', 'should return "a"');
        assert.strictEqual(arr.removeLast(), 'c', 'should return "c"');
        assert.deepStrictEqual(arr, ['b'], 'should return the modified array');
    });

    it('should inser object at index 2', () => {
        const arr = ['a', 'b', 'c', 'd'];
        assert.strictEqual(arr.length, 4);
        assert.ok(arr[2], 'c');
        arr.insertAt(2, 'E');
        assert.strictEqual(arr.length, 5);
        assert.ok(arr[2], 'E');
    });
});