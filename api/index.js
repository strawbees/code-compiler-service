const server = require('../server.js')
const compiler = require('../compiler.js')

module.exports = async (request, response) => {
	server.recursivelyClearOld()
	await compiler.init()

	response.setHeader('Access-Control-Allow-Origin', '*')
	if (request.url.length === 1) {
		server.indexRequest(request, response)
		return
	}
	const firstChar = request.url.charAt(1)
	if (firstChar === 'c') {
		server.configRequest(request, response)
	} else {
		const code = decodeURIComponent(request.url.substr(1))
		const result = await compiler.runBuild(code)
		response.writeHead(200, { 'Content-Type' : 'application/json' })
		response.end(JSON.stringify(result))
	}
}
