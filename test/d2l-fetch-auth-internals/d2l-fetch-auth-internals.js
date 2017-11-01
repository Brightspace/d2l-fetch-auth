describe('D2LFetchAuth class internals', function() {
	var d2lFetchAuth,
		xsrfTokenKey = 'XSRF.Token',
		xsrfTokenValue = 'foo',
		defaultScope = '*:*:*',
		authToken = {
			access_token: 'such access wow',
			expires_at: Number.MAX_VALUE
		},
		authTokenResponse = {
			headers: { 'x-csrf-token': xsrfTokenValue },
			body: { access_token: authToken.access_token, expires_at: authToken.expires_at }
		};

	function clock() {
		return (Date.now() / 1000) | 0;
	}

	beforeEach(function() {
		setXsrfToken(xsrfTokenValue);
		sinon.stub(window, 'fetch');
		d2lFetchAuth = new window.d2lfetch.D2LFetchAuth();
	});

	afterEach(function() {
		clearXsrfToken();
		window.fetch.restore();
	});

	it('should be a thing', function() {
		expect(d2lFetchAuth).to.be.an.instanceOf(window.d2lfetch.D2LFetchAuth);
	});

	function clearXsrfToken() {
		window.localStorage.removeItem(xsrfTokenKey);
	}

	function setXsrfToken(value) {
		window.localStorage.setItem(xsrfTokenKey, value);
	}

	describe('XSRF request', function() {
		it('should send a XSRF request when the XSRF token does not exist in local storage', function() {
			clearXsrfToken();

			window.fetch.returns(
				Promise.resolve(
					new Response(
						'{ "referrerToken": "' + xsrfTokenValue + '" }'
					)
				)
			);

			return d2lFetchAuth._getXsrfToken()
				.then(function(xsrfToken) {
					expect(xsrfToken).to.equal(xsrfTokenValue);
				});
		});

		it('should use xsrf token if it exists in local storage', function() {
			setXsrfToken('oh yeah, awesome');

			return d2lFetchAuth._getXsrfToken()
				.then(function(xsrfToken) {
					expect(xsrfToken).to.equal('oh yeah, awesome');
				});
		});
	});

	describe('Auth token request', function() {
		afterEach(function() {
			d2lFetchAuth._resetAuthTokenCaches();
		});

		it('should send an auth token request when auth token does not exist', function(done) {
			window.fetch.returns(
				Promise.resolve(
					new Response(
						JSON.stringify(authTokenResponse.body),
						{ status: 200, referrerToken: xsrfTokenValue }
					)
				)
			);

			d2lFetchAuth._getAuthToken()
				.then(function(authToken) {

					var req = window.fetch.args[0][0];
					expect(req.method).to.equal('POST');
					expect(req.url).to.have.string('/d2l/lp/auth/oauth2/token');
					expect(req.headers.get('x-csrf-token')).to.equal(xsrfTokenValue);
					expect(authToken).to.equal(authTokenResponse.body.access_token);
					req.text().then(function(bodyText) {
						expect(bodyText).to.equal('scope=' + defaultScope);
						done();
					});
				});
		});

		it('should send an auth token request when auth token is expired', function(done) {
			window.fetch.returns(
				Promise.resolve(
					new Response(
						JSON.stringify(authTokenResponse.body),
						{ status: 200, referrerToken: xsrfTokenValue }
					)
				)
			);

			d2lFetchAuth._cacheToken(defaultScope, {
				access_token: 'token',
				expires_at: clock() - 1
			});

			d2lFetchAuth._getAuthToken()
				.then(function(authToken) {

					var req = window.fetch.args[0][0];
					expect(req.method).to.equal('POST');
					expect(req.url).to.have.string('/d2l/lp/auth/oauth2/token');
					expect(req.headers.get('x-csrf-token')).to.equal(xsrfTokenValue);
					expect(authToken).to.equal(authTokenResponse.body.access_token);
					req.text().then(function(bodyText) {
						expect(bodyText).to.equal('scope=' + defaultScope);
						done();
					});
				});
		});

		it('should use cached auth token if it exists', function() {
			d2lFetchAuth._cacheToken(defaultScope, authToken);
			return d2lFetchAuth._getAuthToken()
				.then(function(token) {
					expect(token).to.equal(authToken.access_token);
				});
		});

		it('should not use cached tokens after session change', function(done) {
			window.fetch.returns(
				Promise.resolve(
					new Response(
						JSON.stringify(authTokenResponse.body),
						{ status: 200, referrerToken: xsrfTokenValue }
					)
				)
			);

			var alternativeToken = {
				access_token: 'cool beans',
				expires_at: Number.MAX_VALUE
			};

			d2lFetchAuth._cacheToken(defaultScope, alternativeToken);
			d2lFetchAuth._getAuthToken()
				.then(function(token) {
					expect(token).to.equal(alternativeToken.access_token);
					d2lFetchAuth._onStorage({ key: 'Session.UserId' });
					d2lFetchAuth._getAuthToken()
						.then(function(token) {
							expect(token).to.equal(authToken.access_token);
							done();
						});
				});
		});
	});

	describe('isRelativeUrl', function() {

		it('should treat relative URLs as relative', function() {
			var isRelative = d2lFetchAuth._isRelativeUrl('/relative/url');
			expect(isRelative).to.be.true;
		});

		it('should treat non-relative URLs as non-relative', function() {
			var isRelative = d2lFetchAuth._isRelativeUrl('http://foo.com/bar');
			expect(isRelative).to.be.false;
		});

		// IE adds the port (:80) to the inbound URL, which needs to be ignored
		it('should treat URLs with the same host as current page as relative', function() {
			var locationStub = sinon.stub(d2lFetchAuth, '_getCurrentLocation')
				.returns({ host: 'foo.com', protocol: 'http:' });
			var isRelative = d2lFetchAuth._isRelativeUrl('http://foo.com/bar');
			locationStub.restore();
			expect(isRelative).to.be.true;
		});

		// IE adds the port (:443) to the inbound URL, which needs to be ignored
		it('should treat HTTPS URLs with same host as current page as relative', function() {
			var locationStub = sinon.stub(d2lFetchAuth, '_getCurrentLocation')
				.returns({ host: 'foo.com', protocol: 'https:' });
			var isRelative = d2lFetchAuth._isRelativeUrl('https://foo.com/bar');
			locationStub.restore();
			expect(isRelative).to.be.true;
		});
	});
});
