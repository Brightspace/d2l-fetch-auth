import { D2LFetchAuth } from '../../src/unframed/d2lfetch-auth.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';

describe('D2LFetchAuth class internals', () => {
	let d2lFetchAuth, sandbox;
	const xsrfTokenKey = 'XSRF.Token',
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

	beforeEach(() => {
		setXsrfToken(xsrfTokenValue);
		sandbox = sinon.createSandbox();
		sandbox.stub(window, 'fetch');
		d2lFetchAuth = new D2LFetchAuth();
	});

	afterEach(() => {
		clearXsrfToken();
		sandbox.restore();
	});

	it('should be a thing', () => {
		expect(d2lFetchAuth).to.be.an.instanceOf(D2LFetchAuth);
	});

	function clearXsrfToken() {
		window.localStorage.removeItem(xsrfTokenKey);
	}

	function setXsrfToken(value) {
		window.localStorage.setItem(xsrfTokenKey, value);
	}

	describe('XSRF request', () => {
		it('should send a XSRF request when the XSRF token does not exist in local storage', () => {
			clearXsrfToken();

			window.fetch.returns(
				Promise.resolve(
					new Response(
						`{ "referrerToken": "${xsrfTokenValue}" }`
					)
				)
			);

			return d2lFetchAuth._getXsrfToken()
				.then((xsrfToken) => {
					expect(xsrfToken).to.equal(xsrfTokenValue);
				});
		});

		it('should use xsrf token if it exists in local storage', () => {
			setXsrfToken('oh yeah, awesome');

			return d2lFetchAuth._getXsrfToken()
				.then((xsrfToken) => {
					expect(xsrfToken).to.equal('oh yeah, awesome');
				});
		});
	});

	describe('Auth token request', () => {
		afterEach(() => {
			d2lFetchAuth._resetAuthTokenCaches();
		});

		it('should send an auth token request when auth token does not exist', (done) => {
			window.fetch.returns(
				Promise.resolve(
					new Response(
						JSON.stringify(authTokenResponse.body),
						{ status: 200, referrerToken: xsrfTokenValue }
					)
				)
			);

			d2lFetchAuth._getAuthToken()
				.then((authToken) => {

					const req = window.fetch.args[0][0];
					expect(req.method).to.equal('POST');
					expect(req.url).to.have.string('/d2l/lp/auth/oauth2/token');
					expect(req.headers.get('x-csrf-token')).to.equal(xsrfTokenValue);
					expect(authToken).to.equal(authTokenResponse.body.access_token);
					req.text().then((bodyText) => {
						expect(bodyText).to.equal(`scope=${defaultScope}`);
						done();
					});
				});
		});

		it('should send an auth token request when auth token is expired', (done) => {
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
				.then((authToken) => {

					const req = window.fetch.args[0][0];
					expect(req.method).to.equal('POST');
					expect(req.url).to.have.string('/d2l/lp/auth/oauth2/token');
					expect(req.headers.get('x-csrf-token')).to.equal(xsrfTokenValue);
					expect(authToken).to.equal(authTokenResponse.body.access_token);
					req.text().then((bodyText) => {
						expect(bodyText).to.equal(`scope=${defaultScope}`);
						done();
					});
				});
		});

		it('should account for server clock skew when deciding if a token is expired', () => {
			// put the server ~10 minutes ahead
			const skew = 10 * 60;
			setupResponse();

			// call once to get clock skew calculation
			return d2lFetchAuth
				._getAuthToken()
				.then(() => {
					// overwrite the, what would be now cached token
					// the expiry value of this token wouldn't normally be considered expired
					// but the skew should push it over
					d2lFetchAuth._cacheToken(defaultScope, {
						access_token: 'token',
						expires_at: clock() + Math.round(skew / 2)
					});

					setupResponse();
					return d2lFetchAuth
						._getAuthToken()
						.then(authToken => {
							expect(window.fetch.args[0][0].url).to.have.string('/d2l/lp/auth/oauth2/token');
							expect(authToken).to.equal(authTokenResponse.body.access_token);
						});
				});

			function setupResponse() {
				const serverDateString = new Date((clock() + skew) * 1000).toUTCString();
				window.fetch.returns(
					Promise.resolve(
						new Response(
							JSON.stringify(authTokenResponse.body),
							{ status: 200, headers: { Date: serverDateString } }
						)
					)
				);
			}
		});

		it('should use cached auth token if it exists', () => {
			d2lFetchAuth._cacheToken(defaultScope, authToken);
			return d2lFetchAuth._getAuthToken()
				.then((token) => {
					expect(token).to.equal(authToken.access_token);
				});
		});

		it('should not use cached tokens after session change', (done) => {
			window.fetch.returns(
				Promise.resolve(
					new Response(
						JSON.stringify(authTokenResponse.body),
						{ status: 200, referrerToken: xsrfTokenValue }
					)
				)
			);

			const alternativeToken = {
				access_token: 'cool beans',
				expires_at: Number.MAX_VALUE
			};

			d2lFetchAuth._cacheToken(defaultScope, alternativeToken);
			d2lFetchAuth._getAuthToken()
				.then((token) => {
					expect(token).to.equal(alternativeToken.access_token);
					d2lFetchAuth._onStorage({ key: 'Session.UserId' });
					d2lFetchAuth._getAuthToken()
						.then((token) => {
							expect(token).to.equal(authToken.access_token);
							done();
						});
				});
		});
	});

	describe('isRelativeUrl', () => {

		it('should treat relative URLs as relative', () => {
			const isRelative = d2lFetchAuth._isRelativeUrl('/relative/url');
			expect(isRelative).to.be.true;
		});

		it('should treat non-relative URLs as non-relative', () => {
			const isRelative = d2lFetchAuth._isRelativeUrl('http://foo.com/bar');
			expect(isRelative).to.be.false;
		});

		// IE adds the port (:80) to the inbound URL, which needs to be ignored
		it('should treat URLs with the same host as current page as relative', () => {
			const locationStub = sinon.stub(d2lFetchAuth, '_getCurrentLocation')
				.returns({ host: 'foo.com', protocol: 'http:' });
			const isRelative = d2lFetchAuth._isRelativeUrl('http://foo.com/bar');
			locationStub.restore();
			expect(isRelative).to.be.true;
		});

		// IE adds the port (:443) to the inbound URL, which needs to be ignored
		it('should treat HTTPS URLs with same host as current page as relative', () => {
			const locationStub = sinon.stub(d2lFetchAuth, '_getCurrentLocation')
				.returns({ host: 'foo.com', protocol: 'https:' });
			const isRelative = d2lFetchAuth._isRelativeUrl('https://foo.com/bar');
			locationStub.restore();
			expect(isRelative).to.be.true;
		});
	});
});
