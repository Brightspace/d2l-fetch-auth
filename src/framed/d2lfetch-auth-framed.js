import jwt from 'frau-jwt/framed';

export class D2LFetchAuthFramed {

	wrap(request, next) {
		if (false === request instanceof Request) {
			return Promise.reject(new TypeError('Invalid request argument supplied; must be a valid window.Request object.'));
		}

		next = next || function(r) { return Promise.resolve(r); };

		if (request.headers.get('Authorization')) {
			return next(request);
		}

		return this._getToken('*:*:*')
			.then((token) => {
				const headers = { 'Authorization': `Bearer ${token}` };
				return next(this._getRequest(request, headers));
			});
	}

	_getRequest(request, headers) {
		if (headers) {
			for (const header in headers) {
				request.headers.set(header, headers[header]);
			}
		}

		return request;
	}

	_getToken(scope) {
		return jwt(scope);
	}

}
