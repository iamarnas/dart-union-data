import * as assert from 'assert';
import { describe, it } from 'mocha';
import Argument from '../../models/argument';
import { extractArguments } from '../../shared/argument-extractor';

suite('Argument Test Suite', () => {
	// Any element such as a string that contains a constructor `(...)`.
	const text = 'constructor -> (String name, int age);';
	const args = extractArguments(text);
	const first = args.at(0)!;
	const second = args.at(1)!;

	describe('Should match arguments lenght', () => {
		const empty = extractArguments('()');

		it('should return length 2 from text', () => {
			assert.strictEqual(args.length, 2);
		});

		it('should return length 0 on empty constructor', () => {
			assert.strictEqual(empty.length, 0);
		});
	});

	describe('Should create variables', () => {
		it('should create mutable variables', () => {
			assert.strictEqual(first.typeAndName, 'String name');
			assert.strictEqual(second.typeAndName, 'int age');
		});

		it('should create immutable variables', () => {
			assert.strictEqual(first.finalVariable, 'final String name');
			assert.strictEqual(second.finalVariable, 'final int age');
		});

		it('should add null check if it is not required, not nullable and is optional', () => {
			const def = extractArguments('(String name)');
			const positional = extractArguments('([String name])');
			const named = extractArguments('({String name})');
			assert.strictEqual(def.at(0)!.finalVariable, 'final String name');
			assert.strictEqual(positional.at(0)!.finalVariable, 'final String? name');
			assert.strictEqual(named.at(0)!.finalVariable, 'final String? name');
		});
	});

	describe('Should match variable data in the argument', () => {
		it('should match type and name', () => {
			const other = new Argument({ type: 'String', name: 'name' });
			assert.deepStrictEqual(first, other);
			assert.strictEqual(first.typeAndName, other.typeAndName);
		});
	});
});
