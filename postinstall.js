const compiler = require('./compiler')

const init = async () => {
	try {
		await compiler.install()
		// On Elastic Beanstalk, npm install is run as root, causing the files
		// genreated by the compiler to not be accessible by the web process.
		if (process.env.AWS_ELASTIC_BEANSTALK) {
			console.log('LOG: Fixing permissions')
			/* eslint-disable global-require */
			const util = require('util')
			const exec = util.promisify(require('child_process').exec)
			/* eslint-enable global-require */
			const { stdout, stderr } = await exec('chown -R webapp:webapp ./') // change owner to webapp
			console.log('LOG: stdout:', stdout)
			console.error('LOG: stderr:', stderr)
		}
	} catch (error) {
		console.log(error)
	}
}
init()
