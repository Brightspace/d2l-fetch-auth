# d2l-fetch-auth
Provides a middleware function for wrapping a window.Request object with d2l authentication for use with d2l-fetch

## Setup

```sh
yarn install
```

## Build

```sh
npm run build
```

## Usage

Reference the script in your html after your reference to `d2l-fetch` (see [here](https://github.com/Brightspace/d2l-fetch) for details on d2l-fetch):

```html
<script src="https://s.brightspace.com/lib/d2lfetch/1.0.0/d2lfetch.js"></script>
<script src="../dist/d2lfetch-auth.js"></script>
```

Alternatively, if you are making requests from within the context of an iFramed Free Range Application (iFRA), reference the framed script:

```html
<script src="https://s.brightspace.com/lib/d2lfetch/0.2.0/d2lfetch.js"></script>
<script src="../dist/d2lfetch-auth-framed.js"></script>
```

This will add the `auth` middleware function to the `d2lfetch` object.

### Auth

Install the `auth` middleware to d2lfetch via the `use` function and then start making your requests.

```js
window.d2lfetch.use(window.d2lfetch.auth);

window.d2lfetch.fetch(new Request('http://example.com/api/entity/1'))
	.then(function(response) {
		// do something with the response
	});
```

## Browser compatibility

`d2l-fetch-auth` makes use of a javascript feature that is not yet fully supported across all modern browsers: [Promises](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise). If you need to support browsers that do not yet implement this feature you will need to include polyfills for this functionality.

We recommend:

* [promise-polyfill](https://github.com/PolymerLabs/promise-polyfill/)
