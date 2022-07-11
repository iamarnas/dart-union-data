import * as glob from 'glob';
import * as Mocha from 'mocha';
import * as path from 'path';

export async function run(): Promise<void> {
	const NYC = require('nyc');
	const nyc = new NYC({
		cwd: path.join(__dirname, '..', '..', '..'),
		exclude: ['**/test/**', '.vscode-test/**'],
		reporter: ['text', 'html'],
		all: true,
		instrument: true,
		hookRequire: true,
		hookRunInContext: true,
		hookRunInThisContext: true,
	});

	await nyc.createTempDirectory();
	//await nyc.reset();
	await nyc.wrap();

	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		color: true
	});

	const testsRoot = path.resolve(__dirname, '..');

	return new Promise((c, e) => {
		glob('**/**.test.js', { cwd: testsRoot }, async (err, files) => {
			if (err) {
				return e(err);
			}

			// Add files to the test suite
			files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

			try {
				// Run the mocha test
				mocha.run(failures => {
					if (failures > 0) {
						e(new Error(`${failures} tests failed.`));
					} else {
						c();
					}
				});
			} catch (err) {
				console.error(err);
				e(err);
			} finally {
				if (nyc) {
					nyc.writeCoverageFile();
					await nyc.report();
				}
			}
		});
	});
}
