import { config } from './rollup.common.config.js';

export default [
	config('d2lfetch.auth', './src/unframed/index.js', './dist/d2lfetch-auth.js'),
	config('d2lfetch.auth', './src/framed/index.js', './dist/d2lfetch-auth-framed.js')
];
