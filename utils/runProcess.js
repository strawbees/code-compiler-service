const defaultOptions = {}
module.exports = (script, cmd, opt = {}, envelope = {}) => new Promise((resolve) => {
	let stdout = ''
	let stderr = ''
	// eslint-disable-next-line no-console
	console.log(`Run process -> ${cmd}`)
	envelope.child = script(cmd, Object.assign({}, opt, defaultOptions))
	envelope.child.stdout.on('data', data => stdout += data)
	envelope.child.stderr.on('data', data => stderr += data)
	envelope.child.on('close', code => {
		// eslint-disable-next-line no-console
		console.log(`child process exited with code ${code}`)
		resolve({ stderr, stdout, code })
	})
})
