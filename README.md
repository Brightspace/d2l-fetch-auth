# d2l-fetch-auth
Provides a middleware function for wrapping a window.Request object with d2l authentication for use with d2l-fetch.

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

Install `d2l-fetch-auth` via npm:
```sh
npm install Brightspace/d2l-fetch-auth
```

```html
<script type="module">
import auth from 'd2l-fetch-auth/dist/d2l-fetch-auth.js';
</script>
```

Alternatively, if you are making requests from within the context of an iFramed Free Range Application (iFRA), reference the framed script:

```html
<script type="module">
import auth from 'd2l-fetch-auth/dist/d2l-fetch-auth.js';
</script>
```

This will import the `auth` middleware function.

### Auth

Install the `auth` middleware to d2lfetch via the `use` function and then start making your requests.

```js
d2lfetch.use({name: 'auth', fn: auth});

d2lfetch.fetch(new Request('http://example.com/api/entity/1'))
	.then(function(response) {
		// do something with the response
	});
```

## Browser compatibility

`d2l-fetch-auth` makes use of a javascript feature that is not yet fully supported across all modern browsers: [Promises](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise). If you need to support browsers that do not yet implement this feature you will need to include polyfills for this functionality.

We recommend:

* [promise-polyfill](https://github.com/PolymerLabs/promise-polyfill/)

## Publishing

The application will automatically increment the minor build version and publish a release version to the Brightspace CDN after merge to the `master` branch is complete. If you wish to increment the `patch` or `major` version instead please add **[increment patch]** or **[increment major]** to the notes inside your merge message.
