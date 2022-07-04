import baseConfig from './rollup.config.js';
import { config } from './rollup.common.config.js';

export default baseConfig
	.concat(config('d2lfetch', './src/unframed/d2lfetch-auth.js', './test/dist/d2lfetch-auth.internals.js'))
	.concat(config('d2lfetch', './src/framed/d2lfetch-auth-framed.js', './test/dist/d2lfetch-auth.framedInternals.js'));
