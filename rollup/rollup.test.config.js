import { config } from './rollup.common.config.js';

export default [
	config('d2lfetch', './src/unframed/d2lfetch-auth.js', './test/dist/d2lfetch-auth.internals.js'),
	config('d2lfetch', './src/framed/d2lfetch-auth-framed.js', './test/dist/d2lfetch-auth.framedInternals.js')
];
