var fs = require('fs');
var path = require('path');
var os = require('os');

var async = require('async');
var expect = require('expect');
var proxyquire = require('proxyquire');

var env = process.env;

function makeHomeCacheDir() {
  var homeCacheDir = path.join(os.homedir(), '.cache');
  if (!fs.existsSync(homeCacheDir)) {
    fs.mkdirSync(homeCacheDir);
  }
}

function eraseHome() {
  delete env.HOME;
  delete env.USERPROFILE;
  delete env.HOMEDRIVE;
  delete env.HOMEPATH;
  delete env.LOGNAME;
  delete env.USER;
  delete env.LNAME;
  delete env.USERNAME;
  delete env.XDG_CACHE_HOME;
  delete env.LOCALAPPDATA;
}

var tmpdir = env.TMPDIR;
var temp = env.TEMP;
var tmp = env.TMP;

function setTemp(dir) {
  env.TMPDIR = env.TEMP = env.TMP = dir;
}

function resetTemp() {
  env.TMPDIR = tmpdir;
  env.TEMP = temp;
  env.TMP = tmp;
}

function cleanup() {
  var v8flags = require('../');

  var files = [
    path.resolve(v8flags.configPath, v8flags.configfile),
    path.resolve(os.tmpdir(), v8flags.configfile),
  ];
  files.forEach(function(file) {
    try {
      fs.unlinkSync(file);
    } catch (e) {
      // Ignore error
    }
  });

  delete require.cache[require.resolve('../')];
  delete require.cache[require.resolve('../config-path')];
  delete require.cache[require.resolve('homedir-polyfill')];

  delete process.versions.electron;
}

describe('v8flags', function() {
  before(makeHomeCacheDir);
  beforeEach(cleanup);
  afterEach(cleanup);

  it('should cache and call back with the v8 flags for the running process', function(done) {
    var v8flags = require('../');
    var configfile = path.resolve(v8flags.configPath, v8flags.configfile);
    v8flags(function(err, flags) {
      expect(Array.isArray(flags)).toEqual(true);
      expect(fs.existsSync(configfile)).toEqual(true);
      fs.unlinkSync(configfile);
      fs.writeFileSync(configfile, JSON.stringify({ cached: true }));
      v8flags(function(cacheErr, cachedFlags) {
        expect(cachedFlags).toEqual({ cached: true });
        done();
      });
    });
  });

  it('should not append the file when multiple calls happen concurrently and the config file does not yet exist', function(done) {
    var v8flags = require('../');
    async.parallel([v8flags, v8flags, v8flags], function() {
      v8flags(function() {
        done();
      });
    });
  });

  it('should fall back to writing to a temp dir if user home is unwriteable', function(done) {
    eraseHome();
    env.HOME = env.LOCALAPPDATA = path.join(__dirname, 'does-not-exist');
    var v8flags = require('../');
    var configfile = path.resolve(os.tmpdir(), v8flags.configfile);
    v8flags(function() {
      expect(fs.existsSync(configfile)).toEqual(true);
      done();
    });
  });

  it('should return flags even if an error is thrown', function(done) {
    eraseHome();
    setTemp('/nope');
    env.HOME = env.LOCALAPPDATA = null;
    var v8flags = require('../');
    v8flags(function(err, flags) {
      resetTemp();
      expect(err).not.toBeNull();
      expect(flags).not.toBeUndefined();
      done();
    });
  });

  it('will not throw on non-matching return from node --v8-options', function(done) {
    if (os.platform() === 'win32') {
      this.skip();
    }

    eraseHome();
    var v8flags = require('../');

    // Save original execPath
    var execPath = process.execPath;
    // Set execPath to our fake-bin
    process.execPath = __dirname + '/fake-bin';

    v8flags(function(err, flags) {
      expect(err).toBeNull();
      expect(flags).toEqual([]);
      // Restore original execPath
      process.execPath = execPath;
      done();
    });
  });

  it('should back with an empty array if the runtime is electron', function(done) {
    process.versions.electron = 'set';
    var v8flags = require('../');
    v8flags(function(err, flags) {
      expect(flags.length).toEqual(0);
      expect(Array.isArray(flags)).toEqual(true);
      done();
    });
  });

  it('should handle usernames which are invalid file paths', function(done) {
    eraseHome();
    env.USER = 'invalid/user\\name';
    var v8flags = require('../');
    v8flags(function(err) {
      expect(err).toBe(null);
      done();
    });
  });

  it('should handle option names with multiple words', function(done) {
    if (parseInt(process.versions.node) < 4) {
      this.skip();
    }

    eraseHome();
    var v8flags = require('../');
    v8flags(function(err, flags) {
      expect(flags).toContain('--expose_gc_as');
      done();
    });
  });

  it('should handle undefined usernames', function(done) {
    eraseHome();
    var v8flags = require('../');
    v8flags(function(err) {
      expect(err).toBe(null);
      done();
    });
  });

  it('should detect non-v8 flags', function(done) {
    eraseHome();
    var v8flags = require('../');
    v8flags(function(err, flags) {
      expect(flags).toContain('--no_deprecation');
      done();
    });
  });

  it('does not detect colliding flags from node', function(done) {
    eraseHome();
    var v8flags = require('../');
    v8flags(function(err, flags) {
      expect(flags).not.toContain('--exec');
      expect(flags).not.toContain('--print');
      expect(flags).not.toContain('--interactive');
      expect(flags).not.toContain('--require');
      expect(flags).not.toContain('--version');
      done();
    });
  });
});

describe('config-path', function() {
  var moduleName = 'js-v8flags';

  before(function() {
    env.HOME = env.USERPROFILE = 'somehome';
  });

  after(cleanup);

  it('should return default linux path in other environments', function(done) {
    var configPath = require('../config-path.js')('other');

    expect(configPath).toEqual(
      path.join(env.HOME, '.cache', moduleName)
    );
    done();
  });

  it('should return default macos path in darwin environment', function(done) {
    var configPath = require('../config-path.js')('darwin');

    expect(configPath).toEqual(
      path.join(env.HOME, 'Library', 'Caches', moduleName)
    );
    done();
  });

  it('should return default windows path in win32 environment', function(done) {
    var configPath = require('../config-path.js')('win32');

    expect(configPath).toEqual(
      path.join(env.HOME, 'AppData', 'Local', moduleName)
    );
    done();
  });

  it('should return fallback path when homedir is falsy', function(done) {
    var configPath = proxyquire('../config-path.js', {
      'homedir-polyfill': function() {
        return null;
      },
    })('win32');

    expect(configPath).toEqual(os.tmpdir());
    done();
  });
});

describe('platform specific tests', function() {
  before(cleanup);

  it('should return fallback path when no home is found under windows', function(done) {
    if (os.platform() !== 'win32' || !process.version.match(/0\.10|0\.12/)) {
      this.skip();
    }

    eraseHome();
    var configPath = require('../config-path.js')('win32');

    expect(configPath).toEqual(os.tmpdir());
    done();
  });
});
