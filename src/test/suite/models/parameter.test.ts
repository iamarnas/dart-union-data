import * as assert from 'assert';
import { it } from 'mocha';
import { Parameter } from '../../../models/parameter';
import { ParametersTemplate } from '../../../templates/parameter.template';

suite('Parameter Test Suite', () => {
    it('equality test', () => {
        const param = ParametersTemplate.from('(int id)').all[0];
        const other = new Parameter({ type: 'int', name: 'id' });

        assert.deepStrictEqual(param, other);
    });

    it('should test if type is explicitly non-nullable', () => {
        const required = ParametersTemplate.from('(int id)').all[0];
        const named = ParametersTemplate.from('({int id})').all[0];
        const positional = ParametersTemplate.from('([int id])').all[0];
        const namedNonNull = ParametersTemplate.from('({int? id})').all[0];
        const positionalNonNull = ParametersTemplate.from('([int? id])').all[0];

        assert.strictEqual(required.isExplicitlyNullable, false);
        assert.strictEqual(required.expression('instance-variable'), 'int id');
        assert.strictEqual(required.expression('final-instance-variable'), 'final int id');

        assert.strictEqual(named.isExplicitlyNullable, true);
        assert.strictEqual(named.expression('instance-variable'), 'int? id');
        assert.strictEqual(named.expression('final-instance-variable'), 'final int? id');

        assert.strictEqual(positional.isExplicitlyNullable, true);
        assert.strictEqual(positional.expression('instance-variable'), 'int? id');
        assert.strictEqual(positional.expression('final-instance-variable'), 'final int? id');

        // Optional named with null check.
        assert.strictEqual(namedNonNull.isExplicitlyNullable, false);
        assert.strictEqual(named.expression('instance-variable'), 'int? id');
        assert.strictEqual(named.expression('final-instance-variable'), 'final int? id');

        // Optional positional with null check.
        assert.strictEqual(positionalNonNull.isExplicitlyNullable, false);
        assert.strictEqual(positional.expression('instance-variable'), 'int? id');
        assert.strictEqual(positional.expression('final-instance-variable'), 'final int? id');
    });

    it('should match method parameter `toString` expressions', () => {
        const requiredParam = ParametersTemplate.from('({required int id})').all[0];
        const requiredNullableParam = ParametersTemplate.from('({int id})').all[0];
        const param = ParametersTemplate.from('(int id)').all[0];

        assert.strictEqual(param.expression(), 'int id');
        assert.strictEqual(requiredParam.expression('this'), 'required this.id');
        assert.strictEqual(requiredParam.expression('func-required-params'), 'required int id');
        assert.strictEqual(param.expression('func-required-params'), 'int id');
        assert.strictEqual(param.expression('name'), 'id');
        assert.strictEqual(param.expression('this'), 'this.id');
        assert.strictEqual(param.expression('func-params'), 'int id');
        assert.strictEqual(param.expression('to-string'), 'id: $id');
        assert.strictEqual(param.expression('hashCode'), 'id.hashCode');
        assert.strictEqual(param.expression('equal-to-other'), 'id == other.id');
        assert.strictEqual(param.expression('undefined'), 'Object id = _undefined');
        assert.strictEqual(requiredParam.expression('undefined'), 'Object id = _undefined');
        assert.strictEqual(requiredNullableParam.expression('undefined'), 'Object? id = _undefined');
        assert.strictEqual(param.expression('super-params'), 'id');
        assert.strictEqual(requiredNullableParam.expression('super-params'), 'id: id');
        assert.strictEqual(param.expression('super-name'), 'super.id');
    });

    it('generic types test', () => {
        const map = ParametersTemplate.from('(final Map<String, dynamic> json)').all[0];
        const mapNamed = ParametersTemplate.from('({final Map<String, dynamic> json})').optionalNamed[0];
        const mapPositional = ParametersTemplate.from('([final Map<String, dynamic> json])').optionalPositional[0];
        const listWithDef = ParametersTemplate.from('({List<List<String>> list = const []})').optionalNamed[0];
        const list = ParametersTemplate.from('(List<List<String>> list)').required[0];
        const listRequired = ParametersTemplate.from('({required List<List<String>> list})').optionalNamed[0];

        assert.strictEqual(map.type, 'Map<String, dynamic>');
        assert.strictEqual(map.name, 'json');
        assert.ok(map.isFinal);
        assert.strictEqual(mapNamed.type, 'Map<String, dynamic>');
        assert.strictEqual(mapNamed.name, 'json');
        assert.strictEqual(mapPositional.type, 'Map<String, dynamic>');
        assert.strictEqual(mapPositional.name, 'json');
        // List.
        assert.strictEqual(listWithDef.type, 'List<List<String>>');
        assert.strictEqual(listWithDef.name, 'list');
        assert.strictEqual(listWithDef.defaultValue, 'const []');
        assert.strictEqual(listRequired.type, 'List<List<String>>');
        assert.strictEqual(listRequired.name, 'list');
        assert.ok(listRequired.isRequired);
        assert.strictEqual(list.type, 'List<List<String>>');
        assert.strictEqual(list.name, 'list');
    });

    it('function type test', () => {
        const func = ParametersTemplate.from('(final String Function(int) age)').all[0];
        const nullable = ParametersTemplate.from('(final String Function(int)? age)').all[0];
        const named = ParametersTemplate.from('({final Map<String, dynamic> Function() json})').optionalNamed[0];
        const positional = ParametersTemplate.from('([final String Function(int) age])').optionalPositional[0];

        const fakeFunc = new Parameter({
            name: 'age',
            type: 'String Function(int)',
            isFinal: true,
        });
        const fakeNamed = new Parameter({
            name: 'json',
            type: 'Map<String, dynamic> Function()',
            isFinal: true,
            isOptional: true,
            isNamed: true,
        });
        const fakePositional = new Parameter({
            name: 'age',
            type: 'String Function(int)',
            isFinal: true,
            isOptional: true,
            isPositional: true,
        });
        const fakeNullable = new Parameter({
            name: 'age',
            type: 'String Function(int)?',
            isFinal: true,
            isNullable: true,
        });

        assert.deepStrictEqual(func, fakeFunc);
        assert.deepStrictEqual(named, fakeNamed);
        assert.deepStrictEqual(positional, fakePositional);
        assert.deepStrictEqual(nullable, fakeNullable);
    });
});
