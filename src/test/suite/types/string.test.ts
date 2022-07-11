import * as assert from 'assert';
import { it } from 'mocha';
import '../../../types/string';

suite('String Types Test Suite', () => {
    it('should pass if string blank or not blank', () => {
        assert.strictEqual('  .'.isNotBlank(), true, 'should return true if not blank');
        assert.strictEqual('  '.isNotBlank(), false, 'should return false if blank');
        assert.strictEqual('  '.isBlank(), true, 'should return true if blank');
        assert.strictEqual(''.isBlank(), true, 'should return true if blank');
        assert.strictEqual(''.isNotBlank(), false, 'should return false if blank');
    });

    it('should capitalize and decapitalize', () => {
        assert.strictEqual('test'.capitalize(), 'Test', 'should change first letter to upper case');
        assert.strictEqual('Test'.decapitalize(), 'test', 'should change first letter to lower case');
    });

    it('should insert string object at index 7 and at index of value "._("', () => {
        const text = 'name._();';
        assert.strictEqual(text.insertAt('._(', 'String name'), 'name._(String name);');
        assert.strictEqual(text.insertAt(7, 'String name'), 'name._(String name);');
        // should return current string on start index -1
        assert.strictEqual(text.insertAt('@', 'String name'), 'name._();');
        assert.strictEqual(text.insertAt(10, 'String name'), 'name._();');
    });

    it('should return a specified range for the string', () => {
        const text = 'name._();';
        assert.strictEqual(text.getRange('._', ')'), '._()');
        assert.strictEqual(text.getRange('._'), '._();');
        assert.strictEqual(text.getRange(4, 8), '._()');
        assert.strictEqual(text.getRange(4), '._();');
        assert.strictEqual(text.getRange('_', ';', true), '()');
        assert.strictEqual(text.getRange(4, 8, true), '._()');
        // should return current string on start index -1
        assert.strictEqual(text.getRange('@', ')'), 'name._();');
        assert.strictEqual(text.getRange(10, ')'), 'name._();');
        assert.strictEqual(text.getRange('@'), 'name._();');
        assert.strictEqual(text.getRange(10), 'name._();');
        assert.strictEqual(text.getRange('._', '@'), '._();');
        assert.strictEqual(text.getRange('._', 10), '._();');
    });

    it('should contain an object from the object list in one string', () => {
        const text = 'String get name => "name";';
        assert.strictEqual(text.includesOne('get', 'final'), true);
        assert.strictEqual(text.includesOne('=>', 'final'), true);
        assert.strictEqual(text.includesOne('+', '@'), false);
    });

    it('should contain all object from the object list in one string', () => {
        const text = 'String get name => "name";';
        assert.strictEqual(text.includesAll('get', '=>'), true);
        assert.strictEqual(text.includesAll('String', 'name'), true);
        assert.strictEqual(text.includesAll('=>', 'final'), false);
        assert.strictEqual(text.includesAll('get', 'final'), false);
    });
});