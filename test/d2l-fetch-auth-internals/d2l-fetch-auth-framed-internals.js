import { D2LFetchAuthFramed } from '../dist/d2lfetch-auth.framedInternals.js';

describe('D2LFetchAuthFramed class internals', function() {
	var d2lFetchAuthFramed,
		sandbox,
		tokenValue = 'Aragorn';

	function getRequest() {
		return new Request('https://api.brightspace.com/path/to/data');
	}

	beforeEach(function() {
		sandbox = sinon.sandbox.create();
		d2lFetchAuthFramed = new D2LFetchAuthFramed();
		sandbox.stub(window, 'fetch');
		sandbox.stub(d2lFetchAuthFramed, '_getToken').returns(Promise.resolve(tokenValue));
	});

	afterEach(function() {
		sandbox.restore();
	});

	it('should be a thing', function() {
		expect(d2lFetchAuthFramed).to.be.an.instanceOf(D2LFetchAuthFramed);
	});

	//TODO: test the stuff with _getToken mocked out
	describe('.wrap', function() {
		it('should get a token', function() {
			return d2lFetchAuthFramed.wrap(getRequest())
				.then(function() {
					expect(d2lFetchAuthFramed._getToken).to.be.called;
				});
		});

		it ('should call _getRequest with the token in an auth header', function() {
			sandbox.spy(d2lFetchAuthFramed, '_getRequest');
			var originalRequest = getRequest();
			return d2lFetchAuthFramed.wrap(originalRequest)
				.then(function() {
					expect(d2lFetchAuthFramed._getRequest).to.be.called;
					var headers = d2lFetchAuthFramed._getRequest.args[0][1];
					expect(headers['Authorization']).to.equal('Bearer ' + tokenValue);
				});
		});

		it ('should resolve to an auth wrapped request', function() {
			return d2lFetchAuthFramed.wrap(getRequest())
				.then(function(output) {
					expect(output instanceof Request);
					expect(output.headers.has('Authorization')).to.equal(true);
				});
		});

		it('should call the next function if provided', function() {
			var next = sandbox.stub().returns(Promise.resolve());
			return d2lFetchAuthFramed.wrap(getRequest('/path/to/data'), next)
				.then(function() {
					expect(next).to.be.called;
				});
		});

		it('should return a promise resolved to a request if next is not provided', function() {
			var request = getRequest('/path/to/data');
			return d2lFetchAuthFramed.wrap(request)
				.then(function(output) {
					expect(output).to.be.an.instanceOf(Request);
				});
		});

	});

	describe('_getRequest', function() {
		it ('should add the provided headers to the provided request', function() {
			var originalRequest = getRequest();
			expect(originalRequest.headers.has('X-Custom-Header')).to.equal(false);
			expect(originalRequest.headers.has('Authorization')).to.equal(false);
			var headersToAdd = { 'X-Custom-Header': 'Xtreme!', 'Authorization': 'let me in!' };
			var outputRequest = d2lFetchAuthFramed._getRequest(originalRequest, headersToAdd);
			expect(outputRequest.headers.get('X-Custom-Header')).to.equal('Xtreme!');
			expect(outputRequest.headers.get('Authorization')).to.equal('let me in!');
		});
	});
});
