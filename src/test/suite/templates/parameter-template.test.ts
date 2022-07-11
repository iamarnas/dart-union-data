import * as assert from 'assert';
import { after, afterEach, describe, it } from 'mocha';
import { Parameter } from '../../../models/parameter';
import { ParametersTemplate } from '../../../templates/parameter.template';

suite('ParameterTemplate Test Suite', () => {
	// Any element such as a string that contains a constructor `(...)`.
	const text = 'constructor -> (String name, int age);';
	const empty = ParametersTemplate.from('()');
	const params = ParametersTemplate.from(text);
	const first = params.all.at(0);
	const second = params.all.at(1);

	after(() => {
		params.clear();
		assert.strictEqual(params.size, 0);
		assert.strictEqual(params.isNotEmpty, false);
		assert.strictEqual(params.isEmpty, true);
	});

	describe('Should match arguments lenght and test initial data', () => {
		it('should return initial data from params', () => {
			assert.strictEqual(params.size, 2);
			assert.strictEqual(params.isNotEmpty, true);
			assert.strictEqual(params.isEmpty, false);
			assert.strictEqual(params.has('name'), true);
			assert.strictEqual(params.get('name')?.type, 'String');
			assert.strictEqual(params.get('test') === undefined, true);
			assert.strictEqual(params.has('age'), true);
			assert.strictEqual(params.has('test'), false);
			assert.deepStrictEqual(params.superParameters, []);
			assert.deepStrictEqual(params.getters, []);
		});

		it('should test empty parameters', () => {
			assert.strictEqual(empty.isEmpty, true);
			assert.strictEqual(empty.isNotEmpty, false);
			assert.strictEqual(empty.hasNamedParameters, false);
			assert.strictEqual(empty.hasOptionalParameters, false);
			assert.strictEqual(empty.hasPositionalParameters, false);
			assert.strictEqual(empty.hasRequiredParameters, false);
		});
	});

	describe('Should create variables', () => {
		it('should create mutable variables', () => {
			assert.strictEqual(first?.expression('instance-variable'), 'String name');
			assert.strictEqual(second?.expression('instance-variable'), 'int age');
		});

		it('should create immutable variables', () => {
			assert.strictEqual(first?.expression('final-instance-variable'), 'final String name');
			assert.strictEqual(second?.expression('final-instance-variable'), 'final int age');
		});

		it('should add null check if it is not required, not nullable and is optional', () => {
			const all = ParametersTemplate.from('(String name)').all;
			const positional = ParametersTemplate.from('([String name])').optionalPositional;
			const named = ParametersTemplate.from('({String name})').optionalNamed;
			assert.strictEqual(all.at(0)?.expression('final-instance-variable'), 'final String name');
			assert.strictEqual(positional.at(0)?.expression('final-instance-variable'), 'final String? name');
			assert.strictEqual(named.at(0)?.expression('final-instance-variable'), 'final String? name');
		});
	});

	describe('Should match variable data in the argument', () => {
		it('should match type and name', () => {
			const other = new Parameter({ type: 'String', name: 'name' });
			assert.deepStrictEqual(first, other);
			assert.strictEqual(
				first.expression('func-params'),
				other.expression('func-params'),
			);
		});
	});

	describe('Should update all as super parameters', () => {
		const temp = ParametersTemplate.from('(String name, int id)');

		afterEach(() => {
			temp.asSuper();
		});

		it('should not have super parameter by default', () => {
			assert.deepStrictEqual(temp.all.at(0), new Parameter({ type: 'String', name: 'name', isSuper: false }));
			assert.deepStrictEqual(temp.all.at(1), new Parameter({ type: 'int', name: 'id', isSuper: false }));
		});

		it('should mark id as super parameter', () => {
			assert.deepStrictEqual(temp.all.at(0), new Parameter({ type: 'String', name: 'name', isSuper: true }));
			assert.deepStrictEqual(temp.all.at(1), new Parameter({ type: 'int', name: 'id', isSuper: true }));
		});
	});

	describe('Should update all as getter parameters', () => {
		const temp = ParametersTemplate.from('(String name, int id)');

		afterEach(() => {
			temp.asGetters();
		});

		it('should not have getters by default', () => {
			assert.deepStrictEqual(temp.all.at(0), new Parameter({ type: 'String', name: 'name', isGetter: false }));
			assert.deepStrictEqual(temp.all.at(1), new Parameter({ type: 'int', name: 'id', isGetter: false }));
		});

		it('should mark id as getter parameter', () => {
			assert.deepStrictEqual(temp.all.at(0), new Parameter({ type: 'String', name: 'name', isGetter: true }));
			assert.deepStrictEqual(temp.all.at(1), new Parameter({ type: 'int', name: 'id', isGetter: true }));
		});
	});

	describe('Should add parameter and test lenght', () => {
		const template = ParametersTemplate.from('()');

		afterEach(() => {
			template.set(new Parameter({ type: 'String', name: 'id' }));
		});

		it('should be empty', () => {
			assert.strictEqual(template.isEmpty, true);
			assert.strictEqual(template.isNotEmpty, false);
			assert.strictEqual(template.all.length, 0);
		});

		it('should be not empty after adding a one parameter', () => {
			assert.strictEqual(template.isEmpty, false);
			assert.strictEqual(template.isNotEmpty, true);
			assert.strictEqual(template.all.length, 1);
			assert.strictEqual(template.all[0].name, 'id');
			assert.strictEqual(template.all[0].type, 'String');
		});
	});
});
