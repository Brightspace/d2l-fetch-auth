import auth from '../../dist/d2lfetch-auth-framed.js';

var invalidRequestInputs = [
	undefined,
	null,
	1,
	'hello',
	{},
	{ whatiam: 'is not a Request'}
];

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
	});

});
