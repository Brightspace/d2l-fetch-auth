import nodeResolve from '@rollup/plugin-node-resolve';

export default {
	input: {
		'd2lfetch-auth': './src/unframed/index.js',
		'd2lfetch-auth-framed': './src/framed/index.js'
	},
	output: {
		dir: 'es6',
		entryFileNames: '[name].js',
		format: 'esm',
		sourcemap: true
	},
	plugins: [
		nodeResolve({
			browser: true
		})
	]
};
