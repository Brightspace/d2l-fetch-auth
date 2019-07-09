import auth from '../../es6/d2lfetch-auth.js';

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
		authToken = 'a.b.c',
		xsrfTokenValue = 'foo';

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
		D2L.LP.Web.Authentication.OAuth2.GetToken.returns(Promise.resolve(authToken));
	}

	beforeEach(function() {
		sandbox = sinon.sandbox.create();
		sandbox.stub(window, 'fetch');

		window.D2L = { LP: { Web: { Authentication: {
			OAuth2: { GetToken: sandbox.stub() },
			Xsrf: { GetXsrfToken: sandbox.stub().returns(xsrfTokenValue) }
		} } } };
	});

	afterEach(function() {
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
			expect(auth instanceof Function).to.equal(true);
		});

		invalidRequestInputs.forEach(function(input) {
			it('should throw a TypeError if it is not passed a Request object', function() {
				return auth(input)
					.then((function() { expect.fail(); }), function(err) { expect(err instanceof TypeError).to.equal(true); });
			});
		});

		it('should not replace an existing authorization header', function() {
			var token = 'this is a custom token from this do not replace auth header test';
			var request = new Request('path/to/data', { headers: { authorization: token } });
			return auth(request)
				.then(function(output) {
					expect(output.headers.get('Authorization')).to.equal(token);
				});
		});

		it('should call the next function if provided', function() {
			var next = sandbox.stub().returns(Promise.resolve());
			return auth(getRequest('/path/to/data'), next)
				.then(function() {
					expect(next).to.be.called;
				});
		});

		it('should return a promise resolved to a request if next is not provided', function() {
			var request = getRequest('/path/to/data');
			return auth(request)
				.then(function(output) {
					expect(output).to.be.an.instanceOf(Request);
				});
		});

		it('should resolve to a request with no auth header when url is relative', function() {
			return auth(getRelativeGETRequest())
				.then(function(req) {
					expect(req.method).to.equal('GET');
					expect(req.headers.get('authorization')).to.not.be.defined;
					expect(req.headers.get('x-csrf-token')).to.not.be.defined;
				});
		});

		it('should resolve to a request with XSRF header when url is relative', function() {
			return auth(getRelativePUTRequest())
				.then(function(req) {
					expect(req.method).to.equal('PUT');
					expect(req.headers.get('x-csrf-token')).to.equal(xsrfTokenValue);
					expect(req.headers.get('accept')).to.equal('application/vnd.siren+json');
				});
		});

		it('should resolve to a request with auth header when url is absolute', function() {
			setupAuthTokenResponse();
			return auth(getAbsolutePathGETRequest())
				.then(function(req) {
					expect(req.headers.get('authorization')).to.equal('Bearer ' + authToken);
				});
		});

		it('should include specified headers in the request', function() {
			return auth(getCustomHeadersGETRequest())
				.then(function(req) {
					expect(req.headers.get('accept')).to.equal('application/vnd.siren+json');
					expect(req.headers.get('x-my-header')).to.equal('my value');
				});
		});

		it('should set the credentials value of the request to same-origin when the url is relative', function() {
			return auth(getRelativeGETRequest())
				.then(function(req) {
					expect(req.credentials).to.equal('same-origin');
				});
		});

		it('should not set the credentials value of the request to same-origin when the url is absolute', function() {
			setupAuthTokenResponse();
			return auth(getAbsolutePathGETRequest())
				.then(function(req) {
					expect(req.credentials).to.equal('omit');
				});
		});

		it('should return rejected promise if auth token request fails', function() {
			D2L.LP.Web.Authentication.OAuth2.GetToken.returns(Promise.reject());

			return auth(getAbsolutePathGETRequest())
				.then(function() {
					expect.fail();
				}, function() {});
		});

		it('should throw if LPs GetToken is not present', function() {
			D2L.LP.Web.Authentication.OAuth2.GetToken = undefined;

			expect(() => auth(getAbsolutePathGETRequest()))
				.to.throw(TypeError);
		});

		it('should throw if LPs GetXsrfToken is not present', function() {
			D2L.LP.Web.Authentication.Xsrf.GetXsrfToken = undefined;

			expect(() => auth(getRelativePUTRequest()))
				.to.throw(TypeError);
		});

	});

});
