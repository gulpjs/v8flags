const homedir = require('user-home');
const path = require('path');

const env = process.env;
const name = 'js-v8flags';

function macos () {
	const library = path.join(homedir, 'Library');
	return path.join(library, 'Caches', name);
};

function windows () {
	const appData = env.LOCALAPPDATA || path.join(homedir, 'AppData', 'Local');
	return path.join(appData, name, 'Cache');
};

// https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html
function linux () {
	const username = path.basename(homedir);
	return path.join(env.XDG_CACHE_HOME || path.join(homedir, '.cache'), name);
};

if (process.platform === 'darwin') {
	module.exports = macos();
} else if (process.platform === 'win32') {
	module.exports =  windows();
} else {
	module.exports = linux();
}
