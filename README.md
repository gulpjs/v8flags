# v8flags
> List available v8 flags.

[![NPM](https://nodei.co/npm/v8flags.png)](https://nodei.co/npm/v8flags/)

## Example
```js
const v8flags = require('v8flags');

v8flags(function(err, flags) {
  console.log(flags);
});
```

## Release History

* 2014-05-09 - v0.1.0 - initial release
* 2014-09-02 - v0.2.0 - cache flags
* 2014-09-02 - v0.3.0 - keep -- in flag names
