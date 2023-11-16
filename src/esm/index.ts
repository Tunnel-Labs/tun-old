import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { isMainThread } from 'node:worker_threads';
import { supportsModuleRegister } from '../utils/node-features';
import { registerLoader } from './register';

// Loaded via --import flag
if (supportsModuleRegister && isMainThread) {
	// When the `--import` flag is used, Node.js tries to load the entrypoint using
	// ESM, which breaks for extension-less JavaScript files.
	// Thus, if we detect that the entrypoint is an extension-less file, we
	// short-circuit and load it via CommonJS instead.
	if (
		process.argv[1] !== undefined &&
		path.extname(process.argv[1]) === '' &&
		fs.existsSync(process.argv[1])
	) {
		createRequire(import.meta.url)(process.argv[1]);
	} else {
		registerLoader();
	}
}

export * from './loaders.js';
