import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import resolve from 'rollup-plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import babel from 'rollup-plugin-babel';

const config = (name, path, output, filename) => ({
	input: `${path}/${filename}.js`,
	plugins: [
		resolve({
			browser: true
		}),
		commonjs(),
		json(),
		babel({
			presets: ['@babel/preset-env']
		}),
		terser()
	],
	output: {
		file: `${output}`,
		format: 'umd',
		name,
		sourcemap: true
	}
});

export default [
	config('d2lfetch.auth', './src/unframed', './dist/d2lfetch-auth.js', 'index'),
	config('d2lfetch.auth', './src/framed', './dist/d2lfetch-auth-framed.js', 'index'),
	config('d2lfetch', './src/unframed', './test/dist/d2lfetch-auth.internals.js', 'd2lfetch-auth'),
	config('d2lfetch', './src/framed', './test/dist/d2lfetch-auth.framedInternals.js', 'd2lfetch-auth-framed')
];
