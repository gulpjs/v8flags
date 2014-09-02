const exec = require('child_process').exec;
const fs = require('fs');
const path = require('path');

const version = process.versions.v8;
const tmpfile = path.join(__dirname, '.flags-'+version);

module.exports = function (cb) {
  fs.exists(tmpfile, function (exists) {
    if (exists) {
      fs.readFile(tmpfile, function (err, flags) {
        if (err) {
          cb(err);
        }
        cb(null, JSON.parse(flags));
      });
    } else {
      exec('node --v8-options', function (err, result) {
        var flags = result.match(/\s\s--(\w+)/gm).map(function (match) {
          return match.substring(4);
        });
        fs.writeFile(tmpfile, JSON.stringify(flags), { encoding:'utf8' },
          function (writeErr) {
            if (writeErr) {
              cb(writeErr);
            } else {
              cb(null, flags);
            }
          }
        );
      });
    }
  });
};
