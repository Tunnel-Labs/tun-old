import { testSuite } from 'manten';
import { type NodeApis } from '../utils/tun';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('repl', ({ test }) => {
		test('handles ts', async () => {
			const tunProcess = node.tun({
				args: ['--interactive'],
			});

			const commands = [
				'const message: string = "SUCCESS"',
				'message',
			];

			await new Promise<void>((resolve) => {
				tunProcess.stdout!.on('data', (data: Buffer) => {
					const chunkString = data.toString();

					if (chunkString.includes('SUCCESS')) {
						return resolve();
					}

					if (chunkString.includes('> ') && commands.length > 0) {
						const command = commands.shift();
						tunProcess.stdin!.write(`${command}\r`);
					}
				});
			});

			tunProcess.kill();
		}, 40_000);

		test('doesn\'t error on require', async () => {
			const tunProcess = node.tun({
				args: ['--interactive'],
			});

			await new Promise<void>((resolve, reject) => {
				tunProcess.stdout!.on('data', (data: Buffer) => {
					const chunkString = data.toString();

					if (chunkString.includes('unsupported-require-call')) {
						return reject(chunkString);
					}

					if (chunkString.includes('[Function: resolve]')) {
						return resolve();
					}

					if (chunkString.includes('> ')) {
						tunProcess.stdin!.write('require("path")\r');
					}
				});
			});

			tunProcess.kill();
		}, 40_000);

		test('supports incomplete expression in segments', async () => {
			const tunProcess = node.tun({
				args: ['--interactive'],
			});

			const commands = [
				['> ', '('],
				['... ', '1'],
				['... ', ')'],
				['1'],
			];

			let [expected, nextCommand] = commands.shift()!;
			await new Promise<void>((resolve) => {
				tunProcess.stdout!.on('data', (data: Buffer) => {
					const chunkString = data.toString();
					if (chunkString.includes(expected)) {
						if (nextCommand) {
							tunProcess.stdin!.write(`${nextCommand}\r`);
							[expected, nextCommand] = commands.shift()!;
						} else {
							resolve();
						}
					}
				});
			});
			tunProcess.kill();
		}, 40_000);

		test('errors on import statement', async () => {
			const tunProcess = node.tun({
				args: ['--interactive'],
			});

			await new Promise<void>((resolve) => {
				tunProcess.stdout!.on('data', (data: Buffer) => {
					const chunkString = data.toString();

					if (chunkString.includes('SyntaxError: Cannot use import statement')) {
						return resolve();
					}

					if (chunkString.includes('> ')) {
						tunProcess.stdin!.write('import fs from "fs"\r');
					}
				});
			});

			tunProcess.kill();
		}, 40_000);
	});
});
