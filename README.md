# d2l-fetch-auth

[![NPM version](https://img.shields.io/npm/v/d2l-fetch-auth.svg)](https://www.npmjs.org/package/d2l-fetch-auth)

Provides a middleware function for wrapping a window.Request object with d2l authentication for use with d2l-fetch.

## Installation

Install from NPM:

```shell
npm install d2l-fetch-auth
```

## Usage

Reference the script in your html after your reference to `d2l-fetch` (see [here](https://github.com/Brightspace/d2l-fetch) for details on d2l-fetch):

```html
<script type="module">
import auth from 'd2l-fetch-auth/d2l-fetch-auth.js';
</script>
```

Alternatively, if you are making requests from within the context of an iFramed Free Range Application (iFRA), reference the framed script:

```html
<script type="module">
import auth from 'd2l-fetch-auth/d2l-fetch-auth-framed.js';
</script>
```

This will import the `auth` middleware function.

### Auth

Install the `auth` middleware to d2lfetch via the `use` function and then start making your requests.

```js
d2lfetch.use({name: 'auth', fn: auth});

const response = await d2lfetch.fetch(
	new Request('http://example.com/api/entity/1')
);
```

### Versioning and Releasing

This repo is configured to use `semantic-release`. Commits prefixed with `fix:` and `feat:` will trigger patch and minor releases when merged to `main`.

To learn how to create major releases and release from maintenance branches, refer to the [semantic-release GitHub Action](https://github.com/BrightspaceUI/actions/tree/main/semantic-release) documentation.
