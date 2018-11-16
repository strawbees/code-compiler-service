module.exports = (path) =>
	// Make sure we dont use windows double backskashes
	(process.platform === 'win32' ? path.split('\\\\').join('\\') : path)
