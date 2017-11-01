const D2L_FETCH_CACHED_TOKENS = {},
	D2L_FETCH_IN_FLIGHT_REQUESTS = {},
	STORAGE_NAME = 'D2L.Fetch.Tokens';

export class D2LFetchAuth {

	constructor() {
		window.addEventListener('storage', this._onSessionChanged.bind(this));
		window.addEventListener('d2l-logout', this._onLogout.bind(this));
		this._enableTokenCache = false;
	}

	wrap(request, next) {
		if (false === request instanceof Request) {
			return Promise.reject(new TypeError('Invalid request argument supplied; must be a valid window.Request object.'));
		}

		next = next || function(r) { return Promise.resolve(r); };

		if (request.headers.get('Authorization')) {
			return next(request);
		}

		if (this._isRelativeUrl(request.url)) {
			request = new Request(request, {
				credentials: 'same-origin'
			});
			if (request.method !== 'GET' && request.method !== 'HEAD') {
				return this._getXsrfToken()
					.then(function(xsrfToken) {
						const headers = { 'X-Csrf-Token': xsrfToken };
						return next(this._getRequest(request, headers));
					}.bind(this));
			} else {
				return next(this._getRequest(request));
			}
		}

		return this._getAuthToken()
			.then(function(token) {
				const headers = { 'Authorization': `Bearer ${token}` };
				return next(this._getRequest(request, headers));
			}.bind(this));
	}

	_isRelativeUrl(url) {

		const link = document.createElement('a');
		link.href = url;

		// IE includes the port in the host
		let urlHost = link.host;
		if (urlHost.indexOf(':443') === urlHost.length - 4) {
			urlHost = urlHost.substr(0, urlHost.length - 4);
		} else if (urlHost.indexOf(':80') === urlHost.length - 3) {
			urlHost = urlHost.substr(0, urlHost.length - 3);
		}

		const currentLocation = this._getCurrentLocation();

		// In IE, relative paths have no host or protocol
		return !link.host
			|| !link.protocol
			|| (urlHost === currentLocation.host
				&& link.protocol === currentLocation.protocol);

	}

	_getCurrentLocation() {
		return location;
	}

	_getRequest(request, headers) {
		if (headers) {
			for (const header in headers) {
				request.headers.set(header, headers[header]);
			}
		}

		return request;
	}

	_getAuthToken() {
		const self = this,
			scope = '*:*:*'; //TODO: Allow this to be overridden

		return Promise
			.resolve()
			.then(() => {
				const cached = self._getCachedAuthToken.bind(self, scope);

				return cached()
					.catch(() => {
						return self._getAuthTokenDeDuped(scope)
							.then(self._cacheToken.bind(self, scope))
							.then(cached);
					});
			});
	}

	_getCachedAuthToken(scope) {
		return Promise
			.resolve()
			.then(function() {
				const cached = this._tryGetCachedToken(scope);
				if (cached) {
					if (!this._tokenExpired(cached)) {
						return cached.access_token;
					}
					this._clearCachedToken(scope);
				}
				throw new Error('No cached token');
			}.bind(this));
	}

	_getAuthTokenDeDuped(scope) {
		if (!D2L_FETCH_IN_FLIGHT_REQUESTS[scope]) {
			D2L_FETCH_IN_FLIGHT_REQUESTS[scope] = this._requestAuthToken(scope)
				.then(function(token) {
					delete D2L_FETCH_IN_FLIGHT_REQUESTS[scope];
					return token;
				}.bind(this))
				.catch(function(e) {
					delete D2L_FETCH_IN_FLIGHT_REQUESTS[scope];
					throw e;
				}.bind(this));
		}

		return D2L_FETCH_IN_FLIGHT_REQUESTS[scope];
	}

	_requestAuthToken(scope) {
		var self = this;

		var authTokenRequest = (xsrfToken) => {
			var request = new Request('/d2l/lp/auth/oauth2/token',
				{
					method: 'POST',
					headers: new Headers({
						'Content-Type': 'application/x-www-form-urlencoded',
						'X-Csrf-Token': xsrfToken
					}),
					body: 'scope=' + scope,
					credentials: 'include'
				}
			);

			return window.fetch(request)
				.then(function(response) {
					if (!response.ok) {
						throw Error(response.statusText);
					}
					return response.json();
				})
				.then(function(json) {
					return json;
				});
		};

		return self._getXsrfToken()
			.then(authTokenRequest);
	}

	_cacheToken(scope, token) {
		D2L_FETCH_CACHED_TOKENS[scope] = token;
		if (this._localStorageSupported()) {
			window.localStorage.setItem(STORAGE_NAME, JSON.stringify(D2L_FETCH_CACHED_TOKENS));
		}
	}

	_tryGetCachedToken(scope) {

		if (!this._localStorageSupported()) {
			return D2L_FETCH_CACHED_TOKENS[scope];
		}

		const storageVal = JSON.parse(window.localStorage.getItem(STORAGE_NAME));
		if (storageVal && storageVal[scope]) {
			return storageVal[scope];
		}

		return null;

	}

	_tokenExpired(token) {
		if (this._localStorageSupported()) {
			const currentUserId = window.localStorage.getItem('Session.UserId');
			const tokenUserId = this._tryGetUserIdFromToken(token);
			if (tokenUserId === null || currentUserId !== tokenUserId) {
				return true;
			}
		}
		return this._clock() > token.expires_at;
	}

	_clock() {
		return (Date.now() / 1000) | 0;
	}

	_onSessionChanged(e) {
		switch (e.key) {
			case 'Session.Expired':
			case 'Session.UserId':
				this._resetAuthTokenCaches();
				break;
			default:
				break;
		}
	}

	_onLogout() {
		this._resetAuthTokenCaches();
	}

	_resetAuthTokenCaches() {
		this._clearAllCachedTokens();
		this._clearInFlightRequests();
	}

	_clearAllCachedTokens() {
		for (const i in D2L_FETCH_CACHED_TOKENS) {
			delete D2L_FETCH_CACHED_TOKENS[i];
		}
		if (this._localStorageSupported()) {
			window.localStorage.removeItem(STORAGE_NAME);
		}
	}

	_clearCachedToken(scope) {
		delete D2L_FETCH_CACHED_TOKENS[scope];
		if (this._localStorageSupported()) {
			window.localStorage.setItem(STORAGE_NAME, JSON.stringify(D2L_FETCH_CACHED_TOKENS));
		}
	}

	_clearInFlightRequests() {
		for (const i in D2L_FETCH_IN_FLIGHT_REQUESTS) {
			delete D2L_FETCH_IN_FLIGHT_REQUESTS[i];
		}
	}

	_getXsrfToken() {

		try {
			var xsrfToken = window.localStorage.getItem('XSRF.Token');
		} catch (e) {
			// likely private browsing mode, continue anyway
		}

		if (xsrfToken) {
			return Promise.resolve(xsrfToken);
		}

		var xsrfRequest = new Request(
			'/d2l/lp/auth/xsrf-tokens',
			{
				credentials: 'include'
			}
		);

		var request = window.fetch(xsrfRequest)
			.then(function(response) {
				return response.json();
			})
			.then(function(responseBody) {
				try {
					window.localStorage.setItem('XSRF.Token', responseBody.referrerToken);
				} catch (e) {
					// likely private browsing mode, continue anyway
				}
				return responseBody.referrerToken;
			});

		return request;
	}

	_tryGetUserIdFromToken(token) {

		const parts = token.access_token.split('.');
		if (parts.length !== 3) return null;

		try {
			const decoded = JSON.parse(atob(parts[1]));
			const userId = decoded.sub;
			return userId;
		} catch (e) {
			return null;
		}

	}

	_localStorageSupported() {
		if (!this._enableTokenCache) return false;
		try {
			window.localStorage.setItem('supported', '1');
			window.localStorage.removeItem('supported');
			return true;
		} catch (error) {
			return false;
		}
	}
}
