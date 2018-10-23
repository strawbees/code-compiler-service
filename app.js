require('./compiler')
require('./server')

process.on('disconnect', process.exit) // parent process is killed
process.on('SIGINT', process.exit ) // catch ctrl-c
process.on('SIGTERM', process.exit ) // catch kill
