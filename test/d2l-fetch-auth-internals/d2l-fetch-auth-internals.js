import { D2LFetchAuth } from '../dist/d2lfetch-auth.internals.js';

describe('D2LFetchAuth class internals', function() {
	var d2lFetchAuth;

	beforeEach(function() {
		d2lFetchAuth = new D2LFetchAuth();
	});

	it('should be a thing', function() {
		expect(d2lFetchAuth).to.be.an.instanceOf(D2LFetchAuth);
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
