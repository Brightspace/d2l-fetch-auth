import { D2LFetchAuthFramed } from './d2lfetch-auth-framed.js';

const fetchAuthFramed = new D2LFetchAuthFramed();

export default function auth(request, next) {
	return fetchAuthFramed.wrap(request, next);
}
