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
		authToken = {
			access_token: 'such access wow',
			expires_at: Number.MAX_VALUE
		},
		xsrfTokenKey = 'XSRF.Token',
		xsrfTokenValue = 'foo',
		authTokenResponse = {
			headers: { 'x-csrf-token': xsrfTokenValue },
			body: { access_token: authToken.access_token, expires_at: authToken.expires_at }
		};

	function clearXsrfToken() {
		window.localStorage.removeItem(xsrfTokenKey);
	}

	function setXsrfToken(value) {
		window.localStorage.setItem(xsrfTokenKey, value);
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

	beforeEach(function() {
		sandbox = sinon.sandbox.create();
		setXsrfToken(xsrfTokenValue);
		sandbox.stub(window, 'fetch');
	});

	afterEach(function() {
		clearXsrfToken();
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

	});

});
