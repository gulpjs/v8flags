// this entire module is depressing. i should have spent my time learning
// how to patch v8 so that these options would just be available on the
// process object.

const os = require('os');
const fs = require('fs');
const path = require('path');

const execFile = require('child_process').execFile;
const env = process.env;
const user = env.LOGNAME || env.USER || env.LNAME || env.USERNAME;

// include v8 version to ensure this works across upgrades of node
// include username to ensure this works across multiple users when
// a home directory can't be found.
const configFile = '.v8flags.'+process.versions.v8+'.'+user+'.json';

const exclusions = ['--help'];

const failureMessage = [
  'Unable to cache a config file for v8flags to a your home directory',
  'or a temporary folder. To fix this problem, please correct your',
  'environment by setting HOME=/path/to/home or TEMP=/path/to/temp.',
  'NOTE: the user running this must be able to access provided path.',
  'If all else fails, please open an issue here:',
  'http://github.com/tkellen/js-v8flags'
].join('\n');

function fail (err) {
  err.message += '\n\n' + failureMessage;
  return err;
}

function configPath () {
  const userHome = require('user-home');
  const isWindows = process.platform === 'win32';
  const baseDir = userHome || os.tmpdir();
  const cachePath = isWindows ? path.join('AppData', 'Local') : '.cache';
  const configPath = userHome ? path.join(baseDir, cachePath) : baseDir;
  return path.join(configPath, configFile);
}

function openConfig (cb) {
  var content;
  var file = configPath();
  try {
    content = require(file);
    process.nextTick(function () {
      cb(null, content);
    });
  } catch (e) {
    fs.open(file, 'w+', function (err, fd) {
      if (err) {
        return cb(fail(err));
      }
      return cb(null, fd);
    });
  }
}

function writeConfig (fd, cb) {
  execFile(process.execPath, ['--v8-options'], function (execErr, result) {
    var flags;
    if (execErr) {
      return cb(execErr);
    }
    flags = result.match(/\s\s--(\w+)/gm).map(function (match) {
      return match.substring(2);
    }).filter(function (name) {
      return exclusions.indexOf(name) === -1;
    });
    var buf = new Buffer(JSON.stringify(flags));
    fs.write(fd, buf, 0, buf.length, 0, function (writeErr, bytesWritten, buffer) {
      fs.close(fd, function (closeErr) {
        var err = writeErr || closeErr;
        if (err) {
          return cb(fail(err));
        }
        return cb(null, JSON.parse(buffer.toString()));
      });
    });
  });
}

module.exports = function (cb) {
  openConfig(function (err, result) {
    if (err) {
      return cb(fail(err));
    }
    if (typeof result === 'number') {
      return writeConfig(result, cb);
    }
    return cb(null, result);
  });
};

// export .configfile for backwards compatability
module.exports.configfile = module.exports.configFile = configFile;
module.exports.configPath = configPath;
