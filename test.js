const fs = require('fs');
const path = require('path');
const os = require('os');

const async = require('async');
const expect = require('chai').expect;
const proxyquire = require('proxyquire');

const env = process.env;

function eraseHome () {
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

const tmpdir = env.TMPDIR;
const temp = env.TEMP;
const tmp = env.TMP;

function setTemp (dir) {
  env.TMPDIR = env.TEMP = env.TMP = dir;
}

function resetTemp() {
  env.TMPDIR = tmpdir;
  env.TEMP = temp;
  env.TMP = tmp;
}

function cleanup () {
  const v8flags = require('./');

  const files = [
    path.resolve(v8flags.configPath, v8flags.configfile),
    path.resolve(os.tmpdir(), v8flags.configfile),
  ];
  files.forEach(function (file) {
    try {
      fs.unlinkSync(file);
    } catch (e) {}
  });

  delete require.cache[require.resolve('./')];
  delete require.cache[require.resolve('./config-path')];

  delete process.versions.electron;
}

describe('v8flags', function () {
  beforeEach(cleanup);
  afterEach(cleanup);

  it('should cache and call back with the v8 flags for the running process', function (done) {
    const v8flags = require('./');
    const configfile = path.resolve(v8flags.configPath, v8flags.configfile);
    v8flags(function (err, flags) {
      expect(flags).to.be.a('array');
      expect(fs.existsSync(configfile)).to.be.true;
      fs.unlinkSync(configfile);
      fs.writeFileSync(configfile, JSON.stringify({cached:true}));
      v8flags(function (cacheErr, cachedFlags) {
        expect(cachedFlags).to.deep.equal({cached:true});
        done();
      });
    });
  });

  it('should not append the file when multiple calls happen concurrently and the config file does not yet exist', function (done) {
    const v8flags = require('./');
    const configfile = path.resolve(v8flags.configPath, v8flags.configfile);
    async.parallel([v8flags, v8flags, v8flags], function (err, result) {
      v8flags(function (err2, res) {
        done();
      });
    });
  });

  it('should fall back to writing to a temp dir if user home is unwriteable', function (done) {
    eraseHome();
    env.HOME = env.LOCALAPPDATA = path.join(__dirname, 'does-not-exist');
    const v8flags = require('./');
    const configfile = path.resolve(os.tmpdir(), v8flags.configfile);
    v8flags(function (err, flags) {
      expect(fs.existsSync(configfile)).to.be.true;
      done();
    });
  });

  it('should return flags even if an error is thrown', function (done) {
    eraseHome();
    setTemp('/nope');
    env.HOME = env.LOCALAPPDATA = null;
    const v8flags = require('./');
    v8flags(function (err, flags) {
      resetTemp();
      expect(err).to.not.be.null;
      expect(flags).to.not.be.undefined;
      done();
    });
  });

  it('should back with an empty array if the runtime is electron', function (done) {
    process.versions.electron = 'set';
    const v8flags = require('./');
    v8flags(function (err, flags) {
      expect(flags).to.have.length(0);
      expect(flags).to.be.an('array');
      done();
    });
  });

  it('should handle usernames which are invalid file paths', function(done) {
    eraseHome();
    env.USER = 'invalid/user\\name';
    const v8flags = require('./');
    v8flags(function (err, flags) {
      expect(err).to.be.null;
      done();
    });
  });

  it('should handle undefined usernames', function(done) {
    eraseHome();
    const v8flags = require('./');
    v8flags(function (err, flags) {
      expect(err).to.be.null;
      done();
    });
  });
});

describe('config-path', function () {
  const moduleName = 'js-v8flags';

  before(function () {
    env.HOME = env.USERPROFILE = 'somehome';
  });

  after(cleanup);

  it('should return default linux path in other environments', function (done) {
    const configPath = require('./config-path.js')('other');

    expect(configPath).to.equal(
      path.join(env.HOME, '.cache', moduleName)
    );
    done();
  });

  it('should return default macos path in darwin environment', function (done) {
    const configPath = require('./config-path.js')('darwin');

    expect(configPath).to.equal(
      path.join(env.HOME, 'Library', 'Caches', moduleName)
    );
    done();
  });

  it('should return default windows path in win32 environment', function (done) {
    const configPath = require('./config-path.js')('win32');

    expect(configPath).to.equal(
      path.join(env.HOME, 'AppData', 'Local', moduleName)
    );
    done();
  });

  it('should return fallback path when no home is found', function (done) {
    const configPath = proxyquire('./config-path.js', {
      'homedir-polyfill': function () {
        return null;
      }
    })('win32');

    expect(configPath).to.equal(
      os.tmpdir()
    );
    done();
  });
});
