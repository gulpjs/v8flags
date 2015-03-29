const os = require('os');
const fs = require('fs');
const path = require('path');

const expect = require('chai').expect;

const env = process.env;

describe('v8flags', function () {

  var v8flags;

  beforeEach(function () {
    delete require.cache[require.resolve('user-home')];
  });

  it('should cache and call back with the v8 flags for the running process', function (done) {
    var v8flags = require('./');
    var configfile = path.resolve(require('user-home'), v8flags.configfile);
    v8flags(function (err, flags) {
      expect(flags).to.be.a('array');
      expect(fs.existsSync(configfile)).to.be.true;
      fs.unlinkSync(configfile);
      fs.writeFileSync(configfile, JSON.stringify({cached:true}));
      v8flags(function (cacheErr, cachedFlags) {
        expect(cachedFlags).to.deep.equal({cached:true});
        fs.unlinkSync(configfile);
        done();
      });
    });
  });

  it('should fall back to writing to a temp dir if user home can\'t be found', function (done) {
    delete env.HOME;
    delete env.USERPROFILE;
    delete env.HOMEDRIVE;
    delete env.HOMEPATH;
    delete env.LOGNAME;
    delete env.USER;
    delete env.LNAME;
    delete env.USERNAME;
    var v8flags = require('./');
    var configfile = path.resolve(os.tmpdir(), v8flags.configfile);
    v8flags(function (err, flags) {
      expect(fs.existsSync(configfile)).to.be.true;
      fs.unlinkSync(configfile);
      done();
    });
  });

});
