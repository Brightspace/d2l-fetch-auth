import { D2LFetchAuth } from './d2lfetch-auth.js';

const fetchAuth = new D2LFetchAuth();

module.exports = function auth(request, next, options) {
	if (options) {
		fetchAuth._enableTokenCache = (options.enableTokenCache === true);
		if (options._resetLocalCache) {
			fetchAuth._clearLocalCachedTokens();
		}
	}
	return fetchAuth.wrap(request, next);
};
