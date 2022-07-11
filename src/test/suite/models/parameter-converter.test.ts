import * as assert from 'assert';
import { before, it } from 'mocha';
import { Parameter } from '../../../models/parameter';
import { ParameterConverter } from '../../../models/parameter-converter';

suite('ParameterConverter Test Suite', () => {
    let defaultParams: ParameterConverter;
    let thisParams: ParameterConverter;

    before(() => {
        defaultParams = new ParameterConverter('({List<String> list = const [], int id = 0})');
        thisParams = new ParameterConverter('({String? message, this.code})');
    });

    it('should return empty by wrong input', () => {
        const empty = new ParameterConverter('');
        assert.strictEqual(empty.hasData, false);
        assert.strictEqual(empty.size, 0);
        assert.strictEqual(empty.hasRequiredParameters, false);
        assert.strictEqual(empty.hasNamedParameters, false);
        assert.strictEqual(empty.hasPositionalParameters, false);
        assert.strictEqual(empty.hasOptionalParameters, false);
    });

    it('should have only named parameter', () => {
        const data = new ParameterConverter('({int? id})');
        assert.strictEqual(data.hasData, true);
        assert.strictEqual(data.size, 1);
        assert.strictEqual(data.hasRequiredParameters, false);
        assert.strictEqual(data.hasNamedParameters, true);
        assert.strictEqual(data.hasPositionalParameters, false);
        assert.strictEqual(data.hasOptionalParameters, true);
        assert.strictEqual(data.getParameters()[0].type === 'int', false);
        assert.strictEqual(data.getParameters()[0].type === 'int?', true);
        assert.strictEqual(data.getParameters()[0].name === 'id', true);
    });

    it('should have only positional parameter', () => {
        const data = new ParameterConverter('([int? id])');
        assert.strictEqual(data.hasData, true);
        assert.strictEqual(data.size, 1);
        assert.strictEqual(data.hasRequiredParameters, false);
        assert.strictEqual(data.hasNamedParameters, false);
        assert.strictEqual(data.hasPositionalParameters, true);
        assert.strictEqual(data.hasOptionalParameters, true);
        assert.strictEqual(data.getParameters()[0].type === 'int', false);
        assert.strictEqual(data.getParameters()[0].type === 'int?', true);
        assert.strictEqual(data.getParameters()[0].name === 'id', true);
    });

    it('should have only required parameter', () => {
        const data = new ParameterConverter('(int? id)');
        assert.strictEqual(data.hasData, true);
        assert.strictEqual(data.size, 1);
        assert.strictEqual(data.hasRequiredParameters, true);
        assert.strictEqual(data.hasNamedParameters, false);
        assert.strictEqual(data.hasPositionalParameters, false);
        assert.strictEqual(data.hasOptionalParameters, false);
        assert.strictEqual(data.getParameters()[0].type === 'int', false);
        assert.strictEqual(data.getParameters()[0].type === 'int?', true);
        assert.strictEqual(data.getParameters()[0].name === 'id', true);
    });

    it('should have default value', () => {
        assert.strictEqual(defaultParams.size, 2);
        assert.strictEqual(defaultParams.hasData, true);
        assert.strictEqual(defaultParams.hasNamedParameters, true);
        assert.strictEqual(defaultParams.hasOptionalParameters, true);
        assert.strictEqual(defaultParams.hasPositionalParameters, false);
        assert.strictEqual(defaultParams.hasRequiredParameters, false);

        for (let i = 0; i < defaultParams.getParameters().length; i++) {
            const params = defaultParams.getParameters()[i];
            const other = otherDefaultParams[i];
            assert.deepStrictEqual(params, other);
        }
    });

    it('should decode parameter with a term `this.code`', () => {
        assert.strictEqual(thisParams.size, 2);
        assert.strictEqual(thisParams.hasData, true);
        assert.strictEqual(thisParams.hasNamedParameters, true);
        assert.strictEqual(thisParams.hasOptionalParameters, true);
        assert.strictEqual(thisParams.hasPositionalParameters, false);
        assert.strictEqual(thisParams.hasRequiredParameters, false);

        for (let i = 0; i < thisParams.getParameters().length; i++) {
            const params = thisParams.getParameters()[i];
            const other = otherThisParams[i];
            assert.deepStrictEqual(params, other);
        }
    });

    it('should match required and named constructor parameters', () => {
        let params: Parameter[] = [];

        before(() => {
            params = parametersWithRequired.getParameters();
        });

        for (let i = 0; i < params.length; i++) {
            const param = params[i];
            const other = otherWithRequired[i];
            assert.deepStrictEqual(param, other, `${param} === ${other}`);
        }
    });

    it('should match required and positional constructor parameters', () => {
        let params: Parameter[] = [];

        before(() => {
            params = parametersWithPositional.getParameters();
        });

        for (let i = 0; i < params.length; i++) {
            const param = params[i];
            const other = otherWithPositional[i];
            assert.strictEqual(param, other, `${param} === ${other}`);
        }
    });
});

const parametersWithRequired = new ParameterConverter('('
    + 'String name, '
    + 'int? id, {'
    + 'required String password, '
    + 'final Map<String, dynamic>? data, '
    + 'String Function(int)? age,'
    + '})');

const parametersWithPositional = new ParameterConverter('('
    + 'String name, '
    + 'int? id, ['
    + 'String? password, '
    + 'final Map<String, dynamic>? data, '
    + 'String Function(int)? age,'
    + '])');

const otherWithRequired: Parameter[] = [
    new Parameter({
        name: 'name',
        type: 'String',
    }),
    new Parameter({
        name: 'id',
        type: 'int?',
        isNullable: true,
    }),
    new Parameter({
        name: 'password',
        type: 'String',
        isOptional: true,
        isNamed: true,
        isRequired: true,
    }),
    new Parameter({
        name: 'data',
        type: 'Map<String, dynamic>?',
        isNullable: true,
        isFinal: true,
        isOptional: true,
        isNamed: true,
    }),
    new Parameter({
        name: 'age',
        type: 'String Function(int)?',
        isNullable: true,
        isOptional: true,
        isNamed: true,
        isRequired: true,
    }),
];

const otherWithPositional: Parameter[] = [
    new Parameter({
        name: 'name',
        type: 'String',
    }),
    new Parameter({
        name: 'id',
        type: 'int?',
        isNullable: true,
    }),
    new Parameter({
        name: 'password',
        type: 'String?',
        isOptional: true,
        isPositional: true,
        isNullable: true,
    }),
    new Parameter({
        name: 'data',
        type: 'Map<String, dynamic>?',
        isFinal: true,
        isOptional: true,
        isPositional: true,
        isNullable: true,
    }),
    new Parameter({
        name: 'age',
        type: 'String Function(int)?',
        isOptional: true,
        isPositional: true,
        isNullable: true,
    }),
];

const otherThisParams = [
    new Parameter({
        name: 'message',
        type: 'String?',
        value: '',
        isFinal: false,
        isNullable: true,
        isRequired: false,
        isNamed: true,
        isOptional: true,
        isPositional: false,
        isSuper: false,
        isGetter: false,
        defaultValue: ''
    }),
    new Parameter({
        name: 'code',
        type: 'this.code',
        value: '',
        isFinal: false,
        isNullable: false,
        isRequired: false,
        isNamed: true,
        isOptional: true,
        isPositional: false,
        isSuper: false,
        isGetter: false,
        defaultValue: ''
    }),
];

const otherDefaultParams = [
    new Parameter({
        name: 'list',
        type: 'List<String>',
        value: '[]',
        isFinal: false,
        isNullable: false,
        isRequired: false,
        isNamed: true,
        isOptional: true,
        isPositional: false,
        isSuper: false,
        isGetter: false,
        defaultValue: 'const []'
    }),
    new Parameter({
        name: 'id',
        type: 'int',
        value: '0',
        isFinal: false,
        isNullable: false,
        isRequired: false,
        isNamed: true,
        isOptional: true,
        isPositional: false,
        isSuper: false,
        isGetter: false,
        defaultValue: '0'
    }),
]; 