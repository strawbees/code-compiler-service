const server = require('./server')
const compiler = require('./compiler')

server.warmUp()
server.init()
compiler.init()

process.on('disconnect', process.exit) // parent process is killed
process.on('SIGINT', process.exit) // catch ctrl-c
process.on('SIGTERM', process.exit) // catch kill
