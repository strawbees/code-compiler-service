const { exec } = require('child_process')

module.exports = (command, options = {}, envelope = {}) => new Promise((resolve, reject) => {
	envelope.child = exec(
		command,
		{ maxBuffer : 1024 * 500, ...options },
		(error, stdout, stderr) => {
			if (!options.forceResolve && error !== null) {
				reject(stderr)
			} else {
				resolve({ stdout, stderr })
			}
		}
	)
})
