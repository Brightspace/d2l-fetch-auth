import { D2LFetchAuth } from './d2lfetch-auth.js';

const fetchAuth = new D2LFetchAuth();

module.exports = function auth(request, next, options) {
	if (options && options.enableTokenCache) {
		fetchAuth._enableTokenCache = true;
	} else {
		fetchAuth._enableTokenCache = false;
	}
	return fetchAuth.wrap(request, next);
};
