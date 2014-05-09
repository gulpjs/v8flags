const exec = require('child_process').exec;

// TODO: cache this to a file in the module matching the version number of v8
module.exports = function (callback) {
  exec('node --v8-options', function (err, result) {
    callback(err, result.match(/\s\s--(\w+)/gm).map(function (match) {
      return match.substring(4);
    }));
  });
};
