const http = require('http')
const database = require('./database')
const pkg = require('./package.json')
/**
* Initialize
*/
const init = () => {
	console.log('Server init')
	startServer()
	recursivelyClearOld()
	console.log('Server initialized')
}
/**
* Index
*
* Provides meta info about the compiler
*/
/**
* Starts the webserver
*
* The webserver will act on 3 types of request. One that includes the program
* source code to be added to the compilation queue, one that checks for the
* result of the compilation process, and one for generic config retrival
*
* The source code should be provided direcly as the URL payload, eg:
* http://{host}:{port}/{url-encoded-source-code}
*
* The compilation result should be requested by providing the compilation id as
* the URL payload, prepended by the char 'i', eg:
* http://{host}:{port}/i{compilation-id}
*
* Generic configs should be requested by providing the config key
* the URL payload, prepended by the char 'c', eg:
* http://{host}:{port}/c{config-key}
*/
const startServer = () => {
	const port = process.env.COMPILER_PORT || process.env.PORT || 8080
	const server = http.createServer((request, response) => {
		response.setHeader('Access-Control-Allow-Origin', '*')
		if (request.url.length === 1) {
			indexRequest(request, response)
			return
		}
		const firstChar = request.url.charAt(1)
		if (firstChar === 'i') {
			resultRequest(request, response)
		} else if (firstChar === 'c') {
			configRequest(request, response)
		} else {
			queueRequest(request, response)
		}
	})
	server.listen(port)
	console.log(`Server: Serving on port ${port}`)
}
/**
* Index
*
* Provides meta info about the compiler
*/
const indexRequest = (request, response) => {
	response.writeHead(200, { 'Content-Type' : 'application/json' })
	response.end(JSON.stringify({
		message      : 'Strawbees CODE compiler',
		version      : pkg.version,
		dependencies : pkg.dependencies,
		endpoints    : [
			{
				'/{source-code}' : 'Queues code for compilation'
			},
			{
				'/i{compilation-id}' : 'Retrieves info of an ongoing compilation.'
			},
			{
				'/cfirmware-reset' : 'A valid HEX that will reset the Quirkbot to the factory settings.'
			},
			{
				'/cfirmware-booloader-updater' : 'A valid HEX that will update the Quirkbot bootloader.'
			}
		]
	}, null, '\t'))
}
/**
* Compilation queue handle
*
* Extracts the source code out of the request URL payload, and pipes it to the
* queue process.
*
* On success, a response with status code 200 will be provided, alongside with
* the compilation id for future reference.
*
* On error, a response with status code 403 will be provided, alongside with
* the compiled error message.
*/
const queueRequest = async (request, response) => {
	let code
	try {
		code = decodeURIComponent(request.url.substr(1))
	} catch (e) {}

	try {
		if (code.indexOf('"Quirkbot.h"') === -1) {
			throw new Error('Invalid Quirkbot program')
		}
		const id = await database.create(code)

		response.writeHead(200, { 'Content-Type' : 'application/json' })
		response.end(JSON.stringify({ id, _id : id }))
	} catch (error) {
		response.writeHead(403, { 'Content-Type' : 'application/json' })
		response.end(JSON.stringify({ error : error.message }))
	}
}
/**
* Compilation result handle
*
* Extracts the id out of the request URL payload, and pipes it to the result
* request process
*
* On success, a response with status code 200 will be provided, alongside with
* the compiled hex code.
*
* On error, a response with status code 403 will be provided, alongside with
* the compiled error message.
*/
const resultRequest = async (request, response) => {
	const id = request.url.substr(2)
	let result = { id, _id : id }
	let responseCode
	try {
		const instance = await database.extract(id)
		result = { ...result, ...instance }
		delete result.code
		delete result.createdAt
		// eslint-disable-next-line no-underscore-dangle
		delete result.__v
		responseCode = 200
	} catch (error) {
		console.log(error)
		responseCode = 403
	}

	response.writeHead(responseCode, { 'Content-Type' : 'application/json' })
	response.end(JSON.stringify(result))
}
/**
* Config handle
*
* Extracts the key out of the request URL payload, and pipes it to the result
* request process
*
* On success, a response with status code 200 will be provided, alongside with
* config object
*
* On error, a response with status code 403 will be provided, alongside with
* an compiled error message.
*/
const configRequest = async (request, response) => {
	const key = request.url.substr(2)
	let code
	let body
	try {
		const config = await database.getConfig(key)
		if (config) {
			code = 200
			body = config
		} else {
			code = 404
			body = { message : `key '${key}' not found` }
		}
	} catch (error) {
		code = 403
		body = { message : error.message }
	}
	response.writeHead(code, { 'Content-Type' : 'application/json' })
	response.end(JSON.stringify(body))
}
/**
* Recursive Database cleanup routine
*
* Every 40 seconds request the database to delete entries that are created more
* that 30 seconds ago. This means that if a program's hex is not requested
* within 30 seconds, it will be discarted.
*/
const recursivelyClearOld = async () => {
	try {
		await database.clearOld(30000)
	} catch (e) {}
	setTimeout(recursivelyClearOld, 40000)
}

module.exports.init = init
