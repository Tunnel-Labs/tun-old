import path from 'path';
import { testSuite, expect } from 'manten';
import packageJson from '../../package.json';
import { tun, tunPath } from '../utils/tun';
import { ptyShell, isWindows } from '../utils/pty-shell';

export default testSuite(({ describe }, fixturePath: string) => {
	describe('CLI', ({ describe, test }) => {
		describe('version', ({ test }) => {
			test('shows version', async () => {
				const tunProcess = await tun({
					args: ['--version'],
				});

				expect(tunProcess.exitCode).toBe(0);
				expect(tunProcess.stdout).toBe(`tun v${packageJson.version}\nnode ${process.version}`);
				expect(tunProcess.stderr).toBe('');
			});

			test('doesn\'t show version with file', async () => {
				const tunProcess = await tun({
					args: [
						path.join(fixturePath, 'log-argv.ts'),
						'--version',
					],
				});

				expect(tunProcess.exitCode).toBe(0);
				expect(tunProcess.stdout).toMatch('"--version"');
				expect(tunProcess.stdout).not.toMatch(packageJson.version);
				expect(tunProcess.stderr).toBe('');
			});
		});

		describe('help', ({ test }) => {
			test('shows help', async () => {
				const tunProcess = await tun({
					args: ['--help'],
				});

				expect(tunProcess.exitCode).toBe(0);
				expect(tunProcess.stdout).toMatch('Node.js runtime enhanced with esbuild for loading TypeScript & ESM');
				expect(tunProcess.stdout).toMatch('Usage: node [options] [ script.js ] [arguments]');
				expect(tunProcess.stderr).toBe('');
			});

			test('doesn\'t show help with file', async () => {
				const tunProcess = await tun({
					args: [
						path.join(fixturePath, 'log-argv.ts'),
						'--help',
					],
				});

				expect(tunProcess.exitCode).toBe(0);
				expect(tunProcess.stdout).toMatch('"--help"');
				expect(tunProcess.stdout).not.toMatch('tun');
				expect(tunProcess.stderr).toBe('');
			});
		});

		test('Node.js test runner', async () => {
			const tunProcess = await tun({
				args: [
					'--test',
					path.join(fixturePath, 'test-runner-file.ts'),
				],
			});

			expect(tunProcess.stdout).toMatch('# pass 1\n');
			expect(tunProcess.exitCode).toBe(0);
		}, 10_000);

		describe('Relays kill signal', ({ test }) => {
			const signals = ['SIGINT', 'SIGTERM'];

			for (const signal of signals) {
				test(signal, async () => {
					const tunProcess = tun({
						args: [
							path.join(fixturePath, 'catch-signals.js'),
						],
					});

					tunProcess.stdout!.once('data', () => {
						tunProcess.kill(signal, {
							forceKillAfterTimeout: false,
						});
					});

					const tunProcessResolved = await tunProcess;

					if (process.platform === 'win32') {
						/**
						 * Windows doesn't support sending signals to processes.
						 * https://nodejs.org/api/process.html#signal-events
						 *
						 * Sending SIGINT, SIGTERM, and SIGKILL will cause the unconditional termination
						 * of the target process, and afterwards, subprocess will report that the process
						 * was terminated by signal.
						 */
						expect(tunProcessResolved.stdout).toBe('READY');
					} else {
						expect(tunProcessResolved.exitCode).toBe(200);
						expect(tunProcessResolved.stdout).toBe(`READY\n${signal}\n${signal} HANDLER COMPLETED`);
					}
				}, 10_000);
			}
		});

		describe('Ctrl + C', ({ test }) => {
			test('Exit code', async () => {
				const output = await ptyShell(
					[
						`${process.execPath} ${tunPath} ./tests/fixtures/keep-alive.js\r`,
						stdout => stdout.includes('READY') && '\u0003',
						`echo EXIT_CODE: ${isWindows ? '$LastExitCode' : '$?'}\r`,
					],
				);
				expect(output).toMatch(/EXIT_CODE:\s+130/);
			}, 10_000);

			test('Catchable', async () => {
				const output = await ptyShell(
					[
						`${process.execPath} ${tunPath} ./tests/fixtures/catch-signals.js\r`,
						stdout => stdout.includes('READY') && '\u0003',
						`echo EXIT_CODE: ${isWindows ? '$LastExitCode' : '$?'}\r`,
					],
				);

				expect(output).toMatch(
					process.platform === 'win32'
						? 'READY\r\nSIGINT\r\nSIGINT HANDLER COMPLETED\r\n'
						: 'READY\r\n^CSIGINT\r\nSIGINT HANDLER COMPLETED\r\n',
				);
				expect(output).toMatch(/EXIT_CODE:\s+200/);
			}, 10_000);
		});
	});
});
