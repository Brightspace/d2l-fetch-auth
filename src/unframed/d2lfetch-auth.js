export class D2LFetchAuth {

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
				const headers = { 'X-Csrf-Token': D2L.LP.Web.Authentication.Xsrf.GetXsrfToken() };
				return next(this._getRequest(request, headers));
			} else {
				return next(this._getRequest(request));
			}
		}

		return D2L.LP.Web.Authentication.OAuth2.GetToken('*:*:*')
			.then(function(token) {
				const headers = { 'Authorization': `Bearer ${token}` };
				request = new Request(request, {
					credentials: 'omit'
				});
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
}
