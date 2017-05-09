const homedir = require('user-home');
const path = require('path');

const env = process.env;

const macos = function (name) {
	const library = path.join(homedir, 'Library');

	return path.join(library, 'Caches', name);
};

const windows = function (name) {
	const appData = env.LOCALAPPDATA || path.join(homedir, 'AppData', 'Local');

	return path.join(appData, name, 'Cache');
};

// https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html
const linux = function (name) {
	const username = path.basename(homedir);

	return path.join(env.XDG_CACHE_HOME || path.join(homedir, '.cache'), name);
};

module.exports = function (name) {
	if (process.platform === 'darwin') {
		return macos(name);
	}

	if (process.platform === 'win32') {
		return windows(name);
	}

	return linux(name);
};
