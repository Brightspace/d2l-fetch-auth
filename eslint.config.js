import { addExtensions, browserConfig, setDirectoryConfigs, testingConfig } from 'eslint-config-brightspace';

export default [
	{
		ignores: ['es6/*']
	},
	...setDirectoryConfigs(
		addExtensions(browserConfig, ['.js', '.html']),
		{ test: testingConfig }
	)
];
