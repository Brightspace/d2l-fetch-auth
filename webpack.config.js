const path = require('path');

var config = {
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /(node_modules|bower_components)/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: ['env']
					}
				}
			}
		]
	}
};

var unframedConfig = Object.assign({}, config, {
	context: path.resolve(__dirname, './src/unframed'),
	entry: {
		app: './index.js'
	},
	output: {
		path: path.resolve(__dirname, './dist'),
		filename: 'd2lfetch-auth.js',
		library: ['d2lfetch', 'auth']
	}
});

var framedConfig = Object.assign({}, config, {
	context: path.resolve(__dirname, './src/framed'),
	entry: {
		app: './index.js'
	},
	output: {
		path: path.resolve(__dirname, './dist'),
		filename: 'd2lfetch-auth-framed.js',
		library: ['d2lfetch', 'auth']
	}
});

var testClassConfig = Object.assign({}, config, {
	context: path.resolve(__dirname, './src'),
	entry: {
		internals: './unframed/d2lfetch-auth.js',
		framedInternals: './framed/d2lfetch-auth-framed.js'
	},
	output: {
		path: path.resolve(__dirname, './test/dist'),
		filename: 'd2lfetch-auth.[name].js',
		library: 'd2lfetch'
	}
});

module.exports = [unframedConfig, framedConfig, testClassConfig];
