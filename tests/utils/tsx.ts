import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { execaNode } from 'execa';
import getNode from 'get-node';

type Options = {
	args: string[];
	nodePath?: string;
	cwd?: string;
};

const __dirname = fileURLToPath(import.meta.url);
export const tunPath = path.join(__dirname, '../../../dist/cli.mjs');

export const tun = (
	options: Options,
) => execaNode(
	tunPath,
	options.args,
	{
		env: {
			ESBK_DISABLE_CACHE: '1',
		},
		nodePath: options.nodePath,
		nodeOptions: [],
		cwd: options.cwd,
		reject: false,
		all: true,
	},
);

export async function createNode(
	nodeVersion: string,
	fixturePath: string,
) {
	console.log('Getting node', nodeVersion);
	const startTime = Date.now();
	const node = await getNode(nodeVersion, {
		progress: true,
	});
	console.log('Got node', Date.now() - startTime, node);

	return {
		version: node.version,
		packageType: '',
		get isCJS() {
			return this.packageType === 'commonjs';
		},
		tun(
			options: Options,
		) {
			return tun({
				...options,
				nodePath: node.path,
			});
		},
		load(
			filePath: string,
			options?: {
				cwd?: string;
				args?: string[];
			},
		) {
			return this.tun(
				{
					args: [
						...(options?.args ?? []),
						filePath,
					],
					cwd: path.join(fixturePath, options?.cwd ?? ''),
				},
			);
		},
		import(
			filePath: string,
			options?: {
				typescript?: boolean;
			},
		) {
			return this.tun({
				args: [
					`./import-file${options?.typescript ? '.ts' : '.js'}`,
					filePath,
				],
				cwd: fixturePath,
			});
		},
		require(
			filePath: string,
			options?: {
				typescript?: boolean;
			},
		) {
			return this.tun({
				args: [
					`./require-file${options?.typescript ? '.cts' : '.cjs'}`,
					filePath,
				],
				cwd: fixturePath,
			});
		},
		requireFlag(
			filePath: string,
		) {
			return this.tun({
				args: [
					'--eval',
					'null',
					'--require',
					filePath,
				],
				cwd: fixturePath,
			});
		},

		loadFile(
			cwd: string,
			filePath: string,
			options?: {
				args?: string[];
			},
		) {
			return this.tun(
				{
					args: [
						...(options?.args ?? []),
						filePath,
					],
					cwd,
				},
			);
		},

		async importFile(
			cwd: string,
			importFrom: string,
			fileExtension = '.mjs',
		) {
			const fileName = `_${Math.random().toString(36).slice(2)}${fileExtension}`;
			const filePath = path.resolve(cwd, fileName);
			await fs.writeFile(filePath, `import * as _ from '${importFrom}';console.log(_)`);
			try {
				return await this.loadFile(cwd, filePath);
			} finally {
				await fs.rm(filePath);
			}
		},

		async requireFile(
			cwd: string,
			requireFrom: string,
			fileExtension = '.cjs',
		) {
			const fileName = `_${Math.random().toString(36).slice(2)}${fileExtension}`;
			const filePath = path.resolve(cwd, fileName);
			await fs.writeFile(filePath, `const _ = require('${requireFrom}');console.log(_)`);
			try {
				return await this.loadFile(cwd, filePath);
			} finally {
				await fs.rm(filePath);
			}
		},
	};
}

export type NodeApis = Awaited<ReturnType<typeof createNode>>;
