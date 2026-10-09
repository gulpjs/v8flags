<p align="center">
  <a href="https://gulpjs.com">
    <img height="257" width="114" src="https://raw.githubusercontent.com/gulpjs/artwork/master/gulp-2x.png">
  </a>
</p>

# v8flags

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Build Status][ci-image]][ci-url] [![Coveralls Status][coveralls-image]][coveralls-url]

Get available v8 and Node.js flags.

## Usage

```js
const v8flags = require("v8flags");

v8flags(function (err, results) {
  console.log(results);
  // [ '--use_strict',
  //   '--es5_readonly',
  //   '--es52_globals',
  //   '--harmony_typeof',
  //   '--harmony_scoping',
  //   '--harmony_modules',
  //   '--harmony_proxies',
  //   '--harmony_collections',
  //   '--harmony',
  // ...
});
```

## API

### `v8flags(cb)`

Finds the available flags and calls the passed callback with any errors and an array of flag results.

### `v8flags.configfile`

The name of the cache file for flags.

### `v8flags.configPath`

The filepath location of the `configfile` above.

## Strict No LLM / No AI Policy

No LLMs for issues.

No LLMs for patches / pull requests.

No LLMs for comments on the bug tracker, including translation.

English is encouraged, but not required. You are welcome to post in your native language and rely on others to have their own translation tools of choice to interpret your words.

## License

MIT

<!-- prettier-ignore-start -->
[downloads-image]: https://img.shields.io/npm/dm/v8flags.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/v8flags
[npm-image]: https://img.shields.io/npm/v/v8flags.svg?style=flat-square

[ci-url]: https://github.com/gulpjs/v8flags/actions/workflows/dev.yml
[ci-image]: https://img.shields.io/github/actions/workflow/status/gulpjs/v8flags/dev.yml?style=flat-square

[coveralls-url]: https://coveralls.io/r/gulpjs/v8flags
[coveralls-image]: https://img.shields.io/coveralls/gulpjs/v8flags/main.svg?style=flat-square
<!-- prettier-ignore-end -->
