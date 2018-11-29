import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import resolve from 'rollup-plugin-node-resolve';

const config = (name, input, output) => ({
	input,
	plugins: [
		resolve({
			browser: true
		}),
		commonjs(),
		json()
	],
	output: {
		file: output,
		format: 'esm',
		name,
		sourcemap: true
	}
});

export default [
	config('d2lfetch.auth', './src/unframed/index.js', './dist/d2lfetch-auth.js'),
	config('d2lfetch.auth', './src/framed/index.js', './dist/d2lfetch-auth-framed.js'),
	config('d2lfetch', './src/unframed/d2lfetch-auth.js', './test/dist/d2lfetch-auth.internals.js'),
	config('d2lfetch', './src/framed/d2lfetch-auth-framed.js', './test/dist/d2lfetch-auth.framedInternals.js')
];
