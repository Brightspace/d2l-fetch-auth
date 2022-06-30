import auth from '../../es6/d2lfetch-auth-framed.js';

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

	beforeEach(() => {
		sandbox = sinon.sandbox.create();
		sandbox.stub(window, 'fetch');
	});

	afterEach(() => {
		sandbox.restore();
	});

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
	});

});
