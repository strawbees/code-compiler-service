const server = require('./server')
const compiler = require('./compiler')

process.on('disconnect', process.exit) // parent process is killed
process.on('SIGINT', process.exit) // catch ctrl-c
process.on('SIGTERM', process.exit) // catch kill

const init = async () => {
	try {
		await server.init()
		await compiler.init()
	} catch (error) {
		console.log(error)
	}
}
init()
