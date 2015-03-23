const os = require('os');
const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;

const expect = require('chai').expect;

const v8flags = require('./');

const tmpfile = path.resolve(os.tmpdir(), process.versions.v8+'.flags.json');

describe('v8flags', function () {

  after(function () {
    fs.unlinkSync(tmpfile);
  });

  it('should call back with the v8 flags for the running process', function (done) {
    // if i could meaningfully test this, this libray wouldn't exist
    v8flags(function (err, flags) {
      expect(flags).to.be.a('array');
      done();
    });
  });

  it('should cache v8 flags after first run', function (done) {
    v8flags(function (err, flags) {
      expect(fs.existsSync(tmpfile)).to.be.true;
      done();
    });
  });

  it('should not fail with a missing $TMP dir on a Linux os', function (done) {
    var cmd ="TMP=\"$(pwd)/tmp\" node -e \"require('./index.js')(function(err, flags){if(err) throw err; else console.log(flags.length);})\"";
    exec(cmd, function (err, stdout, stderr) {
      expect(err).to.be.null;
      done();
    });
  });

});
