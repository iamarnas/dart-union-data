import * as assert from 'assert';
import { it } from 'mocha';
import { regexp, zip } from '../../utils';

suite('API\'s Test Suite', () => {
    it('should zip two arrays into one string', () => {
        const a = ['a', 'b', 'c'];
        const b = [1, 2, 3];

        assert.strictEqual(zip(a, b), 'a 1,b 2,c 3');
        assert.strictEqual(zip(a, b, ', '), 'a 1, b 2, c 3');
        assert.strictEqual(zip(a, b, ', ', ': '), 'a: 1, b: 2, c: 3');
    });

    it('should combine RegExp\'s into one', () => {
        const a = /a/;
        const b = /b/;
        const c = /c/;

        assert.strictEqual(regexp.combine(a, b, c).source, new RegExp(/a|b|c/, 'g').source);
    });
});
