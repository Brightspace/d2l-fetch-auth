import { config } from './rollup.common.config.js';

export default
	config('d2lfetch.auth', './src/unframed/index.js', './es6/d2lfetch-auth.js', './dist/d2lfetch-auth.js')
	.concat(config('d2lfetch.auth', './src/framed/index.js', './es6/d2lfetch-auth-framed.js', './dist/d2lfetch-auth-framed.js'));
