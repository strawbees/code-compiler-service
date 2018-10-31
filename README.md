# Strawbees CODE Compiler Service
A stack that provides a service that compiles Quirkbot programs.

The service is divided into 2 processes: a webserver and compiler worker.

## Webserver
Takes in compilation requests (as c++ source code), and queues them in a database.

After a program has been queued and is waiting for compilation, clients can check query the compilation status by providing the build id.

*The programs will only be stored in the server for 15 seconds! Clients should request the compilation and check it's status immediately after.*
## Compiler worker

Reads queued compilation requests out of a database and compiles them. It doesn't serve any content to external clients.

# Requirements
- Node.js
- NPM
- Mongo

# Supported platforms
The service is depends on OS specific precompiled packages:
- [quirkbot-arduino-builder](https://www.npmjs.com/package/quirkbot-arduino-builder)
- [quirkbot-avr-gcc](https://www.npmjs.com/package/quirkbot-avr-gcc)
