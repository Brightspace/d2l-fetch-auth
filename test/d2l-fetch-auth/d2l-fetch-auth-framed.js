import auth from '../../es6/d2lfetch-auth-framed.js';

var invalidRequestInputs = [
	undefined,
	null,
	1,
	'hello',
	{},
	{ whatiam: 'is not a Request'}
];

function getRelativeGETRequest() {
	return new Request('/path/to/data');
}

describe('d2l-fetch-auth', function() {
	var sandbox;

	beforeEach(function() {
		sandbox = sinon.sandbox.create();
		sandbox.stub(window, 'fetch');
	});

	afterEach(function() {
		sandbox.restore();
	});

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

		it('should resolve to a request with no auth header when url is relative', function() {
			return auth(getRelativeGETRequest())
				.then(function(req) {
					expect(req.method).to.equal('GET');
					expect(req.headers.get('authorization')).to.not.be.defined;
					expect(req.headers.get('x-csrf-token')).to.not.be.defined;
				});
		});
	});

});
