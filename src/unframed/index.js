import { D2LFetchAuth } from './d2lfetch-auth.js';

const fetchAuth = new D2LFetchAuth();

module.exports = function auth(request, next) {
	return fetchAuth.wrap(request, next);
};
