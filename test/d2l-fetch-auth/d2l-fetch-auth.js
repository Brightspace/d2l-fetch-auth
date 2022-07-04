import auth from '../../es6/d2lfetch-auth.js';

const invalidRequestInputs = [
	undefined,
	null,
	1,
	'hello',
	{},
	{ whatiam: 'is not a Request' }
];

describe('d2l-fetch-auth', () => {

	let sandbox;
	const authToken = createTokenForUser('169'),
		xsrfTokenKey = 'XSRF.Token',
		xsrfTokenValue = 'foo',
		localStorageKey = 'D2L.Fetch.Tokens',
		authTokenResponse = {
			headers: { 'x-csrf-token': xsrfTokenValue },
			body: { access_token: authToken.access_token, expires_at: authToken.expires_at }
		};

	function createTokenForUser(userId) {
		return {
			access_token: `part1.${btoa(JSON.stringify({ sub: userId }))}.part3`,
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

	beforeEach(() => {
		sandbox = sinon.sandbox.create();
		setXsrfToken(xsrfTokenValue);
		sandbox.stub(window, 'fetch');
	});

	afterEach(() => {
		clearXsrfToken();
		clearTokenCache();
		sandbox.restore();
	});

	function getRequest(path, headers) {
		return new Request(path, { headers: headers });
	}

	it('should create the d2lfetch object if it doesn\'t exist', () => {
		expect(window.d2lfetch).to.be.defined;
	});

	describe('.auth', () => {

		it('should be a function on the d2lfetch object', () => {
			expect(auth instanceof Function).to.equal(true);
		});

		invalidRequestInputs.forEach((input) => {
			it('should throw a TypeError if it is not passed a Request object', () => {
				return auth(input)
					.then((() => { expect.fail(); }), (err) => { expect(err instanceof TypeError).to.equal(true); });
			});
		});

		it('should not replace an existing authorization header', () => {
			const token = 'this is a custom token from this do not replace auth header test';
			const request = new Request('path/to/data', { headers: { authorization: token } });
			return auth(request)
				.then((output) => {
					expect(output.headers.get('Authorization')).to.equal(token);
				});
		});

		it('should call the next function if provided', () => {
			const next = sandbox.stub().returns(Promise.resolve());
			return auth(getRequest('/path/to/data'), next)
				.then(() => {
					expect(next).to.be.called;
				});
		});

		it('should return a promise resolved to a request if next is not provided', () => {
			const request = getRequest('/path/to/data');
			return auth(request)
				.then((output) => {
					expect(output).to.be.an.instanceOf(Request);
				});
		});

		it('should resolve to a request with no auth header when url is relative', () => {
			return auth(getRelativeGETRequest())
				.then((req) => {
					expect(req.method).to.equal('GET');
					expect(req.headers.get('authorization')).to.not.be.defined;
					expect(req.headers.get('x-csrf-token')).to.not.be.defined;
				});
		});

		it('should resolve to a request with XSRF header when url is relative', () => {
			clearXsrfToken();
			window.fetch
				.returns(Promise.resolve(
					new Response(
						`{ "referrerToken": "${xsrfTokenValue}" }`
					)
				));

			return auth(getRelativePUTRequest())
				.then((req) => {
					expect(req.method).to.equal('PUT');
					expect(req.headers.get('x-csrf-token')).to.equal(xsrfTokenValue);
					expect(req.headers.get('accept')).to.equal('application/vnd.siren+json');
				});
		});

		it('should resolve to a request with auth header when url is absolute', () => {
			setupAuthTokenResponse();
			return auth(getAbsolutePathGETRequest())
				.then((req) => {
					expect(req.headers.get('authorization')).to.equal(`Bearer ${authToken.access_token}`);
				});
		});

		it('should include specified headers in the request', () => {
			return auth(getCustomHeadersGETRequest())
				.then((req) => {
					expect(req.headers.get('accept')).to.equal('application/vnd.siren+json');
					expect(req.headers.get('x-my-header')).to.equal('my value');
				});
		});

		it('should set the credentials value of the request to same-origin when the url is relative', () => {
			return auth(getRelativeGETRequest())
				.then((req) => {
					expect(req.credentials).to.equal('same-origin');
				});
		});

		it('should not set the credentials value of the request to same-origin when the url is absolute', () => {
			return auth(getAbsolutePathGETRequest())
				.then((req) => {
					expect(req.credentials).to.equal('omit');
				});
		});

		it('should return rejected promise if XSRF request fails', (done) => {
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

			auth(getAbsolutePathGETRequest())
				.then(() => {
					expect.fail();
				})
				.catch(() => {
					done();
				});
		});

		it('should return rejected promise if auth token request fails', (done) => {
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

			auth(getAbsolutePathGETRequest())
				.then(() => {
					expect.fail();
				})
				.catch(() => {
					done();
				});
		});

		it('should not store auth token in localStorage by default', () => {
			setupAuthTokenResponse();
			return auth(getAbsolutePathGETRequest())
				.then(() => {
					const cachedValue = window.localStorage.getItem(localStorageKey);
					expect(cachedValue).to.be.null;
				});
		});

		it('should store auth token in localStorage when asked', () => {
			window.localStorage.setItem('Session.UserId', '169');
			setupAuthTokenResponse();
			return auth(
				getAbsolutePathGETRequest(),
				undefined, {
					enableTokenCache: true,
					_resetLocalCache: true
				}
			).then(() => {
				const cachedValue = JSON.parse(
					window.localStorage.getItem(localStorageKey)
				);
				expect(cachedValue['*:*:*']).to.eql(authToken);
			});
		});

		it('should not use cached token if it\'s for the wrong user', () => {
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
			return auth(
				getAbsolutePathGETRequest(),
				undefined, {
					enableTokenCache: true,
					_resetLocalCache: true
				}
			).then(() => {
				const expected = JSON.stringify({
					'*:*:*': createTokenForUser('169')
				});
				expect(window.localStorage.getItem(localStorageKey)).to.eql(expected);
			});
		});

		it('should remove cached token when user changes', () => {
			try {
				new StorageEvent('storage');
			} catch (e) {
				// Edge doesn't like custom StorageEvents, so skip the test for now
				return;
			}
			window.localStorage.setItem('Session.UserId', '169');
			window.localStorage.setItem(localStorageKey, 'bad value');
			setupAuthTokenResponse();
			return auth(
				getAbsolutePathGETRequest(),
				undefined, {
					enableTokenCache: true,
					_resetLocalCache: true
				}
			).then(() => {
				const e = new StorageEvent('storage');
				e.initStorageEvent('storage', true, true, 'Session.UserId', '169', '123', window.location.href, window.sessionStorage);
				window.dispatchEvent(e);
				expect(window.localStorage.getItem(localStorageKey)).to.be.null;
			});
		});

		it('should remove cached token when user logs out', () => {
			window.localStorage.setItem('Session.UserId', '169');
			window.localStorage.setItem(localStorageKey, 'bad value');
			setupAuthTokenResponse();
			return auth(
				getAbsolutePathGETRequest(),
				undefined, {
					enableTokenCache: true,
					_resetLocalCache: true
				}
			).then(() => {
				window.dispatchEvent(new CustomEvent('d2l-logout'));
				expect(window.localStorage.getItem(localStorageKey)).to.be.null;
			});
		});

	});

});
