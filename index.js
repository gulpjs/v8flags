const fs = require('fs');
const path = require('path');

const exec = require('child_process').exec;
const nodePath = process.execPath;
const version = process.versions.v8;
const tmpfile = path.join(__dirname, version+'.flags.json');
const exclusions = ['--help'];

module.exports = function (cb) {

  if (fs.existsSync(tmpfile)) {
    process.nextTick(function () {
      cb(null, require(tmpfile))
    });
  } else {
    exec('"'+nodePath+'" --v8-options', function (execErr, result) {
      var flags;
      if (execErr) {
        cb(execErr)
      } else {
        flags = result.match(/\s\s--(\w+)/gm).map(function (match) {
          return match.substring(2);
        }).filter(function (name) {
          return exclusions.indexOf(name) === -1;
        });
        fs.writeFile(
          tmpfile,
          JSON.stringify(flags),
          { encoding:'utf8' },
          function (writeErr) {
            if (writeErr) {
              cb(writeErr);
            } else {
              console.log('flags for v8 '+version+' cached.');
              cb(null, flags);
            }
          }
        );
      }
    });
  }

};
