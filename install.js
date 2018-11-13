const compiler = require('./compiler')

const init = async () => {
	try {
		await compiler.install()
	} catch (error) {
		console.log(error)
	}
}
init()
