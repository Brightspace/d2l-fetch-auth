'use strict';

var invalidRequestInputs = [
	undefined,
	null,
	1,
	'hello',
	{},
	{ whatiam: 'is not a Request'}
];

describe('d2l-fetch-auth', function() {

	var sandbox,
		authToken = createTokenForUser('169'),
		xsrfTokenKey = 'XSRF.Token',
		xsrfTokenValue = 'foo',
		localStorageKey = 'D2L.Fetch.Tokens',
		authTokenResponse = {
			headers: { 'x-csrf-token': xsrfTokenValue },
			body: { access_token: authToken.access_token, expires_at: authToken.expires_at }
		};

	function createTokenForUser(userId) {
		return {
			access_token: 'part1.' + btoa(JSON.stringify({ sub: userId })) + '.part3',
			expires_at: Number.MAX_VALUE
		};
	}

	function clearXsrfToken() {
		window.localStorage.removeItem(xsrfTokenKey);
	}

	function setXsrfToken(value) {
		window.localStorage.setItem(xsrfTokenKey, value);
	}

	function clearTokenCache() {
		window.localStorage.removeItem('Session.UserId');
		window.localStorage.removeItem(localStorageKey);
	}

	function getRelativeGETRequest() {
		return new Request('/path/to/data');
	}

	function getRelativePUTRequest() {
		return new Request('/path/to/data', { method: 'PUT', headers: { Accept: 'application/vnd.siren+json' } });
	}

	function getAbsolutePathGETRequest() {
		return new Request('https://api.example.com/data');
	}

	function getCustomHeadersGETRequest() {
		return new Request('/path/to/data', { headers: { Accept: 'application/vnd.siren+json', 'X-My-Header': 'my value' } });
	}

	function setupAuthTokenResponse() {
		window.fetch
			.withArgs(sinon.match.has('method', 'POST'))
			.returns(
				Promise.resolve(
					new Response(
						JSON.stringify(authTokenResponse.body),
						{ status: 200, referrerToken: xsrfTokenValue }
					)
				)
			);
	}

	beforeEach(function() {
		sandbox = sinon.sandbox.create();
		setXsrfToken(xsrfTokenValue);
		sandbox.stub(window, 'fetch');
	});

	afterEach(function() {
		clearXsrfToken();
		clearTokenCache();
		sandbox.restore();
	});

	function getRequest(path, headers) {
		return new Request(path, { headers: headers });
	}

	it('should create the d2lfetch object if it doesn\'t exist', function() {
		expect(window.d2lfetch).to.be.defined;
	});

	describe('.auth', function() {

		it('should be a function on the d2lfetch object', function() {
			expect(window.d2lfetch.auth instanceof Function).to.equal(true);
		});

		invalidRequestInputs.forEach(function(input) {
			it('should throw a TypeError if it is not passed a Request object', function() {
				return window.d2lfetch.auth(input)
					.then((function() { expect.fail(); }), function(err) { expect(err instanceof TypeError).to.equal(true); });
			});
		});

		it('should not replace an existing authorization header', function() {
			var token = 'this is a custom token from this do not replace auth header test';
			var request = new Request('path/to/data', { headers: { authorization: token } });
			return window.d2lfetch.auth(request)
				.then(function(output) {
					expect(output.headers.get('Authorization')).to.equal(token);
				});
		});

		it('should call the next function if provided', function() {
			var next = sandbox.stub().returns(Promise.resolve());
			return window.d2lfetch.auth(getRequest('/path/to/data'), next)
				.then(function() {
					expect(next).to.be.called;
				});
		});

		it('should return a promise resolved to a request if next is not provided', function() {
			var request = getRequest('/path/to/data');
			return window.d2lfetch.auth(request)
				.then(function(output) {
					expect(output).to.be.an.instanceOf(Request);
				});
		});

		it('should resolve to a request with no auth header when url is relative', function() {
			return window.d2lfetch.auth(getRelativeGETRequest())
				.then(function(req) {
					expect(req.method).to.equal('GET');
					expect(req.headers.get('authorization')).to.not.be.defined;
					expect(req.headers.get('x-csrf-token')).to.not.be.defined;
				});
		});

		it('should resolve to a request with XSRF header when url is relative', function() {
			clearXsrfToken();
			window.fetch
				.returns(Promise.resolve(
					new Response(
						'{ "referrerToken": "' + xsrfTokenValue + '" }'
					)
				));

			return window.d2lfetch.auth(getRelativePUTRequest())
				.then(function(req) {
					expect(req.method).to.equal('PUT');
					expect(req.headers.get('x-csrf-token')).to.equal(xsrfTokenValue);
					expect(req.headers.get('accept')).to.equal('application/vnd.siren+json');
				});
		});

		it('should resolve to a request with auth header when url is absolute', function() {
			setupAuthTokenResponse();
			return window.d2lfetch.auth(getAbsolutePathGETRequest())
				.then(function(req) {
					expect(req.headers.get('authorization')).to.equal('Bearer ' + authToken.access_token);
				});
		});

		it('should include specified headers in the request', function() {
			return window.d2lfetch.auth(getCustomHeadersGETRequest())
				.then(function(req) {
					expect(req.headers.get('accept')).to.equal('application/vnd.siren+json');
					expect(req.headers.get('x-my-header')).to.equal('my value');
				});
		});

		it('should set the credentials value of the request to same-origin when the url is relative', function() {
			return window.d2lfetch.auth(getRelativeGETRequest())
				.then(function(req) {
					expect(req.credentials).to.equal('same-origin');
				});
		});

		it('should not set the credentials value of the request to same-origin when the url is absolute', function() {
			return window.d2lfetch.auth(getAbsolutePathGETRequest())
				.then(function(req) {
					expect(req.credentials).to.equal('omit');
				});
		});

		it('should return rejected promise if XSRF request fails', function(done) {
			clearXsrfToken();

			window.fetch
				.withArgs(sinon.match.has('method', 'GET'))
				.returns(
					Promise.resolve(
						new Response(
							'{}', {
								status: 404,
								statusText: 'not found'
							}
						)
					)
				);

			window.d2lfetch.auth(getAbsolutePathGETRequest())
				.then(function() {
					expect.fail();
				})
				.catch(function() {
					done();
				});
		});

		it('should return rejected promise if auth token request fails', function(done) {
			window.fetch
				.withArgs(sinon.match.has('method', 'POST'))
				.returns(
					Promise.resolve(
						new Response(
							'{}', {
								status: 404,
								statusText: 'not found'
							}
						)
					)
				);

			window.d2lfetch.auth(getAbsolutePathGETRequest())
				.then(function() {
					expect.fail();
				})
				.catch(function() {
					done();
				});
		});

		it('should not store auth token in localStorage by default', function() {
			setupAuthTokenResponse();
			return window.d2lfetch.auth(getAbsolutePathGETRequest())
				.then(function() {
					const cachedValue = window.localStorage.getItem(localStorageKey);
					expect(cachedValue).to.be.null;
				});
		});

		it('should store auth token in localStorage when asked', function() {
			window.localStorage.setItem('Session.UserId', '169');
			setupAuthTokenResponse();
			return window.d2lfetch.auth(
					getAbsolutePathGETRequest(),
					undefined, {
						enableTokenCache: true,
						_resetLocalCache: true
					}
				).then(function() {
					const cachedValue = JSON.parse(
						window.localStorage.getItem(localStorageKey)
					);
					expect(cachedValue['*:*:*']).to.eql(authToken);
				});
		});

		it('should not use cached token if it\'s for the wrong user', function() {
			window.localStorage.setItem('Session.UserId', '169');
			window.localStorage.setItem(
				localStorageKey,
				JSON.stringify(
					{
						'*:*:*': createTokenForUser('123')
					}
				)
			);
			setupAuthTokenResponse();
			return window.d2lfetch.auth(
					getAbsolutePathGETRequest(),
					undefined, {
						enableTokenCache: true,
						_resetLocalCache: true
					}
				).then(function() {
					const expected = JSON.stringify({
						'*:*:*': createTokenForUser('169')
					});
					expect(window.localStorage.getItem(localStorageKey)).to.eql(expected);
				});
		});

		it('should remove cached token when user changes', function() {
			try {
				new StorageEvent('storage');
			} catch (e) {
				// Edge doesn't like custom StorageEvents, so skip the test for now
				return;
			}
			window.localStorage.setItem('Session.UserId', '169');
			window.localStorage.setItem(localStorageKey, 'bad value');
			setupAuthTokenResponse();
			return window.d2lfetch.auth(
					getAbsolutePathGETRequest(),
					undefined, {
						enableTokenCache: true,
						_resetLocalCache: true
					}
				).then(function() {
					var e = new StorageEvent('storage');
					e.initStorageEvent('storage', true, true, 'Session.UserId', '169', '123', window.location.href, window.sessionStorage);
					window.dispatchEvent(e);
					expect(window.localStorage.getItem(localStorageKey)).to.be.null;
				});
		});

		it('should remove cached token when user logs out', function() {
			window.localStorage.setItem('Session.UserId', '169');
			window.localStorage.setItem(localStorageKey, 'bad value');
			setupAuthTokenResponse();
			return window.d2lfetch.auth(
					getAbsolutePathGETRequest(),
					undefined, {
						enableTokenCache: true,
						_resetLocalCache: true
					}
				).then(function() {
					window.dispatchEvent(new CustomEvent('d2l-logout'));
					expect(window.localStorage.getItem(localStorageKey)).to.be.null;
				});
		});

	});

});
