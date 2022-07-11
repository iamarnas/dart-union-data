import * as assert from 'assert';
import { it } from 'mocha';
import { GenericTypeTemplate } from '../../../templates/generic-type.template';

suite('GenericTypeTemplate Test Suite', () => {
    it('initial data test', () => {
        const input = 'text without generics';
        const genericType = new GenericTypeTemplate(input);
        assert.strictEqual(genericType.displayType, '', 'should be empty');
        assert.strictEqual(genericType.hasData, false, 'should be false');
        assert.strictEqual(genericType.typeString(), '', 'should be empty');
        assert.strictEqual(genericType.type, '', 'should be empty');
        assert.strictEqual(genericType.types.length, 0, 'should be 0');
    });

    it('should pass single generic type check', () => {
        const input = 'Result<T>';
        const genericType = new GenericTypeTemplate(input);
        assert.strictEqual(genericType.displayType, '<T>');
        assert.strictEqual(genericType.hasData, true);
        assert.strictEqual(genericType.typeString(), '<$T>');
        assert.strictEqual(genericType.type, '<T>');
        assert.strictEqual(genericType.types.length, 1);
        assert.strictEqual(genericType.types[0].extendableType, undefined);
    });

    it('should pass a single generic type-check with the extendable type', () => {
        const input = 'Result<T extends Object?>';
        const genericType = new GenericTypeTemplate(input);
        assert.strictEqual(genericType.displayType, '<T extends Object?>');
        assert.strictEqual(genericType.hasData, true);
        assert.strictEqual(genericType.typeString(), '<$T>');
        assert.strictEqual(genericType.type, '<T>');
        assert.strictEqual(genericType.types.length, 1);
        assert.strictEqual(genericType.types[0].type, 'T');
        assert.strictEqual(genericType.types[0].extendableType, 'Object?');
    });

    it('should take main generic type and ignore extendable types', () => {
        const input = 'Result<T extends Object?> extends State<T>';
        const genericType = new GenericTypeTemplate(input);
        assert.strictEqual(genericType.displayType, '<T extends Object?>');
        assert.strictEqual(genericType.hasData, true);
        assert.strictEqual(genericType.typeString(), '<$T>');
        assert.strictEqual(genericType.type, '<T>');
        assert.strictEqual(genericType.types.length, 1);
        assert.strictEqual(genericType.types[0].type, 'T');
        assert.strictEqual(genericType.types[0].extendableType, 'Object?');
    });

    it('should pass multiple generic types check with one type extendable and the second one not', () => {
        const input = 'Result<T, E extends Object?>';
        const genericType = new GenericTypeTemplate(input);
        assert.strictEqual(genericType.displayType, '<T, E extends Object?>');
        assert.strictEqual(genericType.hasData, true);
        assert.strictEqual(genericType.typeString(), '<$T, $E>');
        assert.strictEqual(genericType.type, '<T, E>');
        assert.strictEqual(genericType.types.length, 2);
        assert.strictEqual(genericType.types[0].type, 'T');
        assert.strictEqual(genericType.types[0].extendableType, undefined);
        assert.strictEqual(genericType.types[1].type, 'E');
        assert.strictEqual(genericType.types[1].extendableType, 'Object?');
    });

    it('should format bad written generic type code', () => {
        const badFormat = 'Result<  T ,   E   extends   Object?   >';
        const goodFormat = 'Result<T, E extends Object?>';
        const bad = new GenericTypeTemplate(badFormat);
        const good = new GenericTypeTemplate(goodFormat);

        assert.strictEqual(bad.displayType, good.displayType);
        assert.strictEqual(bad.hasData, good.hasData);
        assert.strictEqual(bad.typeString(), good.typeString());
        assert.strictEqual(bad.type, good.type);
        assert.deepStrictEqual(bad.types, good.types);
    });
});