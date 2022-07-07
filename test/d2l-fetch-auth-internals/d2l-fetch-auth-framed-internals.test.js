import { D2LFetchAuthFramed } from '../../src/framed/d2lfetch-auth-framed.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';

describe('D2LFetchAuthFramed class internals', () => {
	let d2lFetchAuthFramed,
		sandbox;
	const tokenValue = 'Aragorn';

	function getRequest() {
		return new Request('/path/to/data');
	}

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		d2lFetchAuthFramed = new D2LFetchAuthFramed();
		sandbox.stub(window, 'fetch');
		sandbox.stub(d2lFetchAuthFramed, '_getToken').returns(Promise.resolve(tokenValue));
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('should be a thing', () => {
		expect(d2lFetchAuthFramed).to.be.an.instanceOf(D2LFetchAuthFramed);
	});

	//TODO: test the stuff with _getToken mocked out
	describe('.wrap', () => {
		it('should get a token', () => {
			return d2lFetchAuthFramed.wrap(getRequest())
				.then(() => {
					expect(d2lFetchAuthFramed._getToken).to.be.called;
				});
		});

		it ('should call _getRequest with the token in an auth header', () => {
			sandbox.spy(d2lFetchAuthFramed, '_getRequest');
			const originalRequest = getRequest();
			return d2lFetchAuthFramed.wrap(originalRequest)
				.then(() => {
					expect(d2lFetchAuthFramed._getRequest).to.be.called;
					const headers = d2lFetchAuthFramed._getRequest.args[0][1];
					expect(headers['Authorization']).to.equal(`Bearer ${tokenValue}`);
				});
		});

		it ('should resolve to an auth wrapped request', () => {
			return d2lFetchAuthFramed.wrap(getRequest())
				.then((output) => {
					expect(output instanceof Request);
					expect(output.headers.has('Authorization')).to.equal(true);
				});
		});

		it('should call the next function if provided', () => {
			const next = sandbox.stub().returns(Promise.resolve());
			return d2lFetchAuthFramed.wrap(getRequest('/path/to/data'), next)
				.then(() => {
					expect(next).to.be.called;
				});
		});

		it('should return a promise resolved to a request if next is not provided', () => {
			const request = getRequest('/path/to/data');
			return d2lFetchAuthFramed.wrap(request)
				.then((output) => {
					expect(output).to.be.an.instanceOf(Request);
				});
		});

	});

	describe('_getRequest', () => {
		it ('should add the provided headers to the provided request', () => {
			const originalRequest = getRequest();
			expect(originalRequest.headers.has('X-Custom-Header')).to.equal(false);
			expect(originalRequest.headers.has('Authorization')).to.equal(false);
			const headersToAdd = { 'X-Custom-Header': 'Xtreme!', 'Authorization': 'let me in!' };
			const outputRequest = d2lFetchAuthFramed._getRequest(originalRequest, headersToAdd);
			expect(outputRequest.headers.get('X-Custom-Header')).to.equal('Xtreme!');
			expect(outputRequest.headers.get('Authorization')).to.equal('let me in!');
		});
	});
});
