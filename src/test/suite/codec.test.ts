import * as assert from 'assert';
import { describe, it } from 'mocha';
import { DartParameterCodec } from '../../codecs/dart-parameter-codec';
import { Parameter } from '../../models/parameter';

suite('ParameterCodec Test Suite', () => {

    describe('encode', () => {
        it('should read all modifiers', () => {
            assert.deepStrictEqual(
                DartParameterCodec.encode('required final String name', 'named'),
                new Parameter({
                    type: 'String',
                    name: 'name',
                    isRequired: true,
                    isFinal: true,
                    isNamed: true,
                    isOptional: true,
                }),
            );
        });

        it('should not split generic type', () => {
            assert.deepStrictEqual(
                DartParameterCodec.encode('Map<String, Object?> data', 'required'),
                new Parameter({
                    type: 'Map<String, Object?>',
                    name: 'data',
                }),
            );
        });

        it('should match nullable positional parameter', () => {
            assert.deepStrictEqual(
                DartParameterCodec.encode('int? code', 'positional'),
                new Parameter({
                    type: 'int?',
                    name: 'code',
                    isNullable: true,
                    isOptional: true,
                    isPositional: true,
                }),
            );
        });

        it('should encode generic function parameter', () => {
            assert.deepStrictEqual(
                DartParameterCodec.encode('Map<String, dynamic> Function(dynamic) json', 'required'),
                new Parameter({
                    type: 'Map<String, dynamic> Function(dynamic)',
                    name: 'json',
                }),
            );
        });

        it('should encode constant default value', () => {
            assert.deepStrictEqual(
                DartParameterCodec.encode('List<String> data = const []', 'required'),
                new Parameter({
                    type: 'List<String>',
                    name: 'data',
                    defaultValue: 'const []',
                    value: '[]'
                }),
            );
        });

        it('should encode default value', () => {
            assert.deepStrictEqual(
                DartParameterCodec.encode('int code = 200', 'required'),
                new Parameter({
                    type: 'int',
                    name: 'code',
                    defaultValue: '200',
                    value: '200',
                }),
            );
        });
    });

    describe('decode', () => {
        const codec = DartParameterCodec;
        const param = new Parameter({ type: 'int', name: 'code' });
        const nullable = new Parameter({ type: 'int?', name: 'code', isNullable: true });
        const named = new Parameter({ type: 'int', name: 'code', isNamed: true, isOptional: true });
        const required = new Parameter({ type: 'int', name: 'code', isNamed: true, isOptional: true, isRequired: true });

        it('should decode expressions', () => {
            assert.strictEqual(codec.decode(param, 'instance-variable'), 'int code');
            assert.strictEqual(codec.decode(param, 'final-instance-variable'), 'final int code');
            assert.strictEqual(codec.decode(param, 'name'), 'code');
            assert.strictEqual(codec.decode(param, 'func-params'), 'int code');
            assert.strictEqual(codec.decode(param, 'super-name'), 'super.code');
            assert.strictEqual(codec.decode(param, 'super-params'), 'code');
            assert.strictEqual(codec.decode(param, 'hashCode'), 'code.hashCode');
            assert.strictEqual(codec.decode(param, 'equal-to-other'), 'code == other.code');
            assert.strictEqual(codec.decode(param, 'to-string'), 'code: $code');
            assert.strictEqual(codec.decode(param, 'this'), 'this.code');
            assert.strictEqual(codec.decode(param, 'undefined'), 'Object code = _undefined');
        });

        it('should decode expressions on named parameter', () => {
            assert.strictEqual(codec.decode(named, 'super-params'), 'code: code');
        });

        it('should decode expressions on nullable parameter', () => {
            assert.strictEqual(codec.decode(nullable, 'undefined'), 'Object? code = _undefined');
        });

        it('should decode expressions on required named parameter', () => {
            assert.strictEqual(codec.decode(required, 'this'), 'required this.code');
            assert.strictEqual(codec.decode(required, 'func-required-params'), 'required int code');
        });
    });
});