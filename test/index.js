var fs = require("node:fs");
var path = require("node:path");
var os = require("node:os");
var assert = require("node:assert");
var { afterEach, before, beforeEach, describe, it } = require("node:test");

var async = require("async");

var env = process.env;

function makeHomeCacheDir() {
  var homeCacheDir = path.join(os.homedir(), ".cache");
  if (!fs.existsSync(homeCacheDir)) {
    fs.mkdirSync(homeCacheDir);
  }
}

var isWindows = os.platform() === "win32";

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
  var v8flags = require("../");

  var files = [
    path.resolve(v8flags.configPath, v8flags.configfile),
    path.resolve(os.tmpdir(), v8flags.configfile),
  ];
  files.forEach(function (file) {
    try {
      fs.unlinkSync(file);
    } catch {
      // Ignore error
    }
  });

  delete require.cache[require.resolve("../")];
  delete require.cache[require.resolve("../config-path")];

  delete process.versions.electron;
}

describe("v8flags", function () {
  before(makeHomeCacheDir);
  beforeEach(cleanup);
  afterEach(cleanup);

  it("should cache and call back with the v8 flags for the running process", function (t, done) {
    var v8flags = require("../");
    var configfile = path.resolve(v8flags.configPath, v8flags.configfile);
    v8flags(function (err, flags) {
      assert.strictEqual(Array.isArray(flags), true);
      assert.strictEqual(fs.existsSync(configfile), true);
      fs.unlinkSync(configfile);
      fs.writeFileSync(configfile, JSON.stringify({ cached: true }));
      v8flags(function (cacheErr, cachedFlags) {
        assert.deepStrictEqual(cachedFlags, { cached: true });
        done();
      });
    });
  });

  it("should not append the file when multiple calls happen concurrently and the config file does not yet exist", function (t, done) {
    var v8flags = require("../");
    async.parallel([v8flags, v8flags, v8flags], function () {
      v8flags(function () {
        done();
      });
    });
  });

  it("should fall back to writing to a temp dir if user home is unwriteable", function (t, done) {
    eraseHome();
    env.HOME = env.LOCALAPPDATA = path.join(__dirname, "does-not-exist");
    var v8flags = require("../");
    var configfile = path.resolve(os.tmpdir(), v8flags.configfile);
    v8flags(function () {
      assert.strictEqual(fs.existsSync(configfile), true);
      done();
    });
  });

  it("should return flags even if an error is thrown", function (t, done) {
    eraseHome();
    setTemp("/nope");
    env.HOME = env.LOCALAPPDATA = null;
    var v8flags = require("../");
    v8flags(function (err, flags) {
      resetTemp();
      assert.notStrictEqual(err, null);
      assert.notStrictEqual(flags, undefined);
      done();
    });
  });

  it(
    "always has node flags, even when non-matching return from node --v8-options",
    { skip: isWindows },
    function (t, done) {
      eraseHome();
      var v8flags = require("../");

      // Save original execPath
      var execPath = process.execPath;
      // Set execPath to our fake-bin
      process.execPath = __dirname + "/fake-bin";

      v8flags(function (err, flags) {
        assert.strictEqual(err, null);
        assert.deepStrictEqual(
          flags,
          Array.from(process.allowedNodeEnvironmentFlags),
        );

        // Restore original execPath
        process.execPath = execPath;
        done();
      });
    },
  );

  it(
    "fails with an error if the CLI crashes",
    { skip: isWindows },
    function (t, done) {
      eraseHome();
      var v8flags = require("../");

      // Save original execPath
      var execPath = process.execPath;
      // Set execPath to our fake-bin
      process.execPath = __dirname + "/throw-bin";

      v8flags(function (err, flags) {
        assert.notStrictEqual(err, null);
        assert.strictEqual(flags, undefined);
        // Restore original execPath
        process.execPath = execPath;
        done();
      });
    },
  );

  it("should back with an empty array if the runtime is electron", function (t, done) {
    process.versions.electron = "set";
    var v8flags = require("../");
    v8flags(function (err, flags) {
      assert.strictEqual(flags.length, 0);
      assert.strictEqual(Array.isArray(flags), true);
      done();
    });
  });

  it("should handle usernames which are invalid file paths", function (t, done) {
    eraseHome();
    env.USER = "invalid/user\\name";
    var v8flags = require("../");
    v8flags(function (err) {
      assert.strictEqual(err, null);
      done();
    });
  });

  it("should handle option names with multiple words", function (t, done) {
    eraseHome();
    var v8flags = require("../");
    v8flags(function (err, flags) {
      assert.strictEqual(flags.includes("--expose-gc-as"), true);
      done();
    });
  });

  it("should handle undefined usernames", function (t, done) {
    eraseHome();
    var v8flags = require("../");
    v8flags(function (err) {
      assert.strictEqual(err, null);
      done();
    });
  });

  it("should detect non-v8 flags", function (t, done) {
    eraseHome();
    var v8flags = require("../");
    v8flags(function (err, flags) {
      assert.strictEqual(flags.includes("--no-deprecation"), true);
      done();
    });
  });

  it("does not detect colliding flags from node", function (t, done) {
    eraseHome();
    var v8flags = require("../");
    v8flags(function (err, flags) {
      assert.strictEqual(flags.includes("--exec"), false);
      assert.strictEqual(flags.includes("--print"), false);
      assert.strictEqual(flags.includes("--interactive"), false);
      assert.strictEqual(flags.includes("--version"), false);
      // Exclusions
      assert.strictEqual(flags.includes("---completion-bash"), false);
      assert.strictEqual(flags.includes("----help"), false);
      done();
    });
  });

  it("does not detect nodejs example flags", function (t, done) {
    eraseHome();
    var v8flags = require("../");
    v8flags(function (err, flags) {
      assert.strictEqual(flags.includes("--flag"), false);
      assert.strictEqual(flags.includes("--no-flag"), false);
      done();
    });
  });
});

describe("config-path", function () {
  var moduleName = "js-v8flags";

  before(function () {
    //Should not depend on env being erased in previous tests.
    eraseHome();
    env.HOME = env.USERPROFILE = "somehome";
  });
  beforeEach(cleanup);
  afterEach(cleanup);

  it("should return default linux path in other environments", function () {
    var configPath = require("../config-path.js")("other");

    assert.strictEqual(configPath, path.join(env.HOME, ".cache", moduleName));
  });

  it("should return default macos path in darwin environment", function () {
    var configPath = require("../config-path.js")("darwin");

    assert.strictEqual(
      configPath,
      path.join(env.HOME, "Library", "Caches", moduleName),
    );
  });

  it("should return default windows path in win32 environment", function () {
    var configPath = require("../config-path.js")("win32");

    assert.strictEqual(
      configPath,
      path.join(env.HOME, "AppData", "Local", moduleName),
    );
  });

  it("should return fallback path when homedir is falsy", function (t) {
    var fallback = "/some/fallback/via/tmpdir";
    t.mock.module("node:os", {
      namedExports: {
        homedir: () => null,
        tmpdir: () => fallback,
      },
    });
    const configPath = require("../config-path.js")("win32");

    assert.strictEqual(configPath, fallback);
  });
});

describe("platform specific tests", function () {
  before(cleanup);

  it(
    "should return fallback path when no home is found under windows",
    { skip: !isWindows },
    function () {
      eraseHome();
      var configPath = require("../config-path.js")("win32");

      assert.strictEqual(configPath, os.tmpdir());
    },
  );
});
