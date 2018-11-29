import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import resolve from 'rollup-plugin-node-resolve';

export const config = (name, input, output) => ({
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
