import { testSuite } from 'manten';
import type { NodeApis } from '../../utils/tun';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('JavaScript', ({ runTestSuite }) => {
		runTestSuite(import('./cjs'), node);
		runTestSuite(import('./esm'), node);
		runTestSuite(import('./dependencies'), node);
	});
});
