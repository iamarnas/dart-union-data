import * as assert from 'assert';
import { beforeEach } from 'mocha';
import StringBuffer from '../../utils/string-buffer';

suite('StringBufer Test Suite', () => {
    const sb = new StringBuffer();

    beforeEach('Clean the string buffer before each test', () => {
        sb.clean();
    });

    test('Initial string buffer should be empty', () => {
        assert.strictEqual(sb.isEmpty, true);
        assert.strictEqual(sb.isNotEmpty, false);
        assert.strictEqual(sb.length, 0);
    });

    test('Should write text to the buffer', () => {
        sb.write('text');
        assert.strictEqual(sb.toString(), 'text');
        sb.write('tab', 2);
        assert.strictEqual(sb.toString(), 'text\t\ttab', 'Should add two tabs');
    });

    test('Should write text to the new line', () => {
        sb.writeln();
        assert.strictEqual(sb.toString(), '\n');
        sb.writeln('text');
        assert.strictEqual(sb.toString(), '\n\ntext');
        sb.writeln('tab', 2);
        assert.strictEqual(sb.toString(), '\n\ntext\n\t\ttab');
    });

    test('Should write everything in one string', () => {
        sb.writeAll(['a', 1, true]);
        assert.strictEqual(sb.toString(), 'a1true');
        sb.clean();
        sb.writeAll(['a', 1, true], ', ');
        assert.strictEqual(sb.toString(), 'a, 1, true');
        sb.clean();
        sb.writeAll(['a', 1, true], ', ', 2);
        assert.strictEqual(sb.toString(), '\t\ta, \t\t1, \t\ttrue');
    });

    test('Should write each element on a new line', () => {
        sb.writeBlock(['a', 1, true]);
        assert.strictEqual(sb.toString(), '\na\n1\ntrue');
        sb.clean();
        sb.writeBlock(['a', 1, true], ', ');
        assert.strictEqual(sb.toString(), '\na, \n1, \ntrue, ');
        sb.clean();
        sb.writeBlock(['a', 1, true], ', ', 2);
        assert.strictEqual(sb.toString(), '\n\t\ta, \n\t\t1, \n\t\ttrue, ');
    });

    test('Should convert all types to string', () => {
        sb.write(100);
        assert.strictEqual(sb.toString(), '100', 'Should convert number to string');
        sb.clean();
        sb.write(10.15);
        assert.strictEqual(sb.toString(), '10.15', 'Should convert float to string');
        sb.clean();
        sb.write(true);
        assert.strictEqual(sb.toString(), 'true', 'Should convert boolean to string');
        sb.clean();
        sb.write({ a: 100 });
        assert.strictEqual(sb.toString(), '{"a":100}', 'Should convert object to string');
    });

    test('Should clean string buffer', () => {
        sb.write('text');
        sb.clean();
        assert.strictEqual(sb.isEmpty, true);
    });

});
