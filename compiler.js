const fs = require('fs').promises
const path = require('path')
const database = require('./database')
const postInstallCleanup = require('./postInstallCleanup')
const execute = require('./utils/execute')
const modulePath = require('./utils/modulePath')
const rimraf = require('./utils/rimraf')
const cpdir = require('./utils/cpdir')

/*
* Create control variables
*/
const TEMP_SLUG = '_tmp_compiler'
const FIRMWARE_SLUG = 'firmware'
const HARDWARE_SLUG = 'quirkbot-arduino-hardware'
const LIBRARY_SLUG = 'quirkbot-arduino-library'
const AVR_GCC_SLUG = 'quirkbot-avr-gcc'
const ARDUINO_BUILDER_SLUG = 'quirkbot-arduino-builder'

const INSTALL_TEMP_DIR = path.resolve(__dirname, TEMP_SLUG)
/*
* The temporary dir that will change depending if the compiler is installing or
* just initializing, and also depending on the platform
*/
let RUNTIME_TEMP_DIR

/*
* The computed script that calculates the size of the .hex
*/
let SIZE_SCRIPT

/*
* The computed compile script
*/
let COMPILE_SCRIPT

/*
* The computed board settings
*/
let BOARD_SETTINGS

/*
* "Warms up" the server by making the initial compilations
*/
const install = async () => {
	console.log('Compiler install')

	const FIRMWARE_DIR = path.resolve(__dirname, FIRMWARE_SLUG)
	const HARDWARE_DIR = modulePath(HARDWARE_SLUG)
	const LIBRARY_DIR = modulePath(LIBRARY_SLUG)
	const AVR_GCC_DIR = modulePath(AVR_GCC_SLUG)
	const ARDUINO_BUILDER_DIR = modulePath(ARDUINO_BUILDER_SLUG)
	/*
	* Clean up temporary directories
	*/
	try {
		await rimraf(INSTALL_TEMP_DIR)
		await fs.mkdir(INSTALL_TEMP_DIR)
		await fs.mkdir(path.join(INSTALL_TEMP_DIR, 'build'))
	} catch (e) {}

	/*
	* Exctract the board settings
	*/
	const boardsTxt = (await fs.readFile(path.join(HARDWARE_DIR, 'avr', 'boards.txt'))).toString()
	const boardSettings = {}
	boardsTxt.split('\n').forEach((line) => {
		const parts = line.split('=')
		if (parts.length === 2) {
			const [key, value] = parts
			boardSettings[key] = value
		}
	})
	await fs.writeFile(path.join(INSTALL_TEMP_DIR, 'boards.json'), JSON.stringify(boardSettings, null, '\t'))

	/*
	* Make an initial compilation of the built in firmwares using
	* arduino-builder, so we can extract the build steps, exactly the same way
	* arduino does it.
	*/
	const arduinoBuilderScript = [
		`"${path.join(ARDUINO_BUILDER_DIR, 'tools', 'arduino-builder')}"`,
		`-hardware="${path.resolve(HARDWARE_DIR, '..')}"`,
		`-libraries="${path.resolve(LIBRARY_DIR, '..')}"`,
		`-hardware="${path.join(ARDUINO_BUILDER_DIR, 'tools', 'hardware')}"`,
		`-tools="${path.join(AVR_GCC_DIR, 'tools')}"`,
		`-tools="${path.join(ARDUINO_BUILDER_DIR, 'tools', 'tools')}"`,
		`-fqbn="${HARDWARE_SLUG}:avr:quirkbot"`,
		'-ide-version=10607',
		`-build-path="${path.join(INSTALL_TEMP_DIR, 'build')}"`,
		'-verbose'
	].join(' ')
	// build the bootloader updater
	await execute([
		arduinoBuilderScript,
		`"${path.join(FIRMWARE_DIR, 'bootloader_updater.ino')}"`
	].join(' '))
	await fs.rename(path.join(INSTALL_TEMP_DIR, 'build', 'bootloader_updater.ino.hex'), path.join(INSTALL_TEMP_DIR, 'bootloader_updater.ino.hex'))

	// build the factory reset (this will produce the output we will use)
	const { stdout : arduinoBuilderOutput } = await execute([
		arduinoBuilderScript,
		`"${path.join(FIRMWARE_DIR, 'firmware.ino')}"`
	].join(' '))
	await fs.rename(path.join(INSTALL_TEMP_DIR, 'build', 'firmware.ino.hex'), path.join(INSTALL_TEMP_DIR, 'factory.ino.hex'))

	/*
	* Precompile header, so we don't need to access the files from the Quirkbot
	* library anymore
	*/
	await execute(
		arduinoBuilderOutput
			.split('\n')
			.filter(line => line.indexOf('firmware.ino.cpp.o') !== -1)[0]
			.split(path.join(INSTALL_TEMP_DIR, 'build', 'sketch', 'firmware.ino.cpp'))
			.join(path.join(LIBRARY_DIR, 'src', 'Quirkbot.h'))
			.split(path.join(LIBRARY_DIR, 'src', 'Quirkbot.h.o'))
			.join(path.join(INSTALL_TEMP_DIR, 'Quirkbot.h.gch'))
	)

	/*
	* Compose the compile script
	*/
	const compileScript = (
		[
			arduinoBuilderOutput
				.split('\n')
				.filter(line =>
					line.indexOf('firmware.ino.cpp.o') !== -1
				)[0],
			arduinoBuilderOutput
				.split('\n')
				.filter(line => line.indexOf('firmware.ino.elf') !== -1 && line.indexOf('avr-size') === -1)
				.filter(line => line.indexOf('firmware.ino.eep') === -1)
				.join('\n')
		].join('\n')
			// transform into a one liner
			.split('\n').join(' && ')
			// replace the quirkbot library include path with the temp path
			// (as the precompiled header is there)
			.split(path.join(LIBRARY_DIR, 'src')).join(path.join(INSTALL_TEMP_DIR))
			// tokenize the paths
			.split(HARDWARE_DIR).join('{{HARDWARE_DIR}}')
			.split(LIBRARY_DIR).join('{{LIBRARY_DIR}}')
			.split(AVR_GCC_DIR).join('{{AVR_GCC_DIR}}')
			.split(ARDUINO_BUILDER_DIR).join('{{ARDUINO_BUILDER_DIR}}')
			.split(INSTALL_TEMP_DIR).join('{{TEMP_DIR}}')

	)
	await fs.writeFile(path.join(INSTALL_TEMP_DIR, 'compile.sh'), compileScript)

	/*
	* Compose the size script
	*/
	const sizeScript = (
		`"${path.join(AVR_GCC_DIR, 'tools', 'avr', 'bin', 'avr-size')}" ` +
		`"${path.join(INSTALL_TEMP_DIR, 'build', 'firmware.ino.elf')}"`
	)
		// tokenize the paths
		.split(HARDWARE_DIR).join('{{HARDWARE_DIR}}')
		.split(LIBRARY_DIR).join('{{LIBRARY_DIR}}')
		.split(AVR_GCC_DIR).join('{{AVR_GCC_DIR}}')
		.split(ARDUINO_BUILDER_DIR).join('{{ARDUINO_BUILDER_DIR}}')
		.split(INSTALL_TEMP_DIR).join('{{TEMP_DIR}}')
	await fs.writeFile(path.join(INSTALL_TEMP_DIR, 'size.sh'), sizeScript)

	/*
	* Delete unecessary files (this will effectly break the node_modules)
	*/
	await postInstallCleanup({
		libraryDir        : LIBRARY_DIR,
		hardwareDir       : HARDWARE_DIR,
		arduinoBuilderDir : ARDUINO_BUILDER_DIR,
		avrGccDir         : AVR_GCC_DIR
	})

	console.log('Compiler installed')
}

const init = async () => {
	console.log('Compiler init')
	const HARDWARE_DIR = modulePath(HARDWARE_SLUG)
	const LIBRARY_DIR = modulePath(LIBRARY_SLUG)
	const AVR_GCC_DIR = modulePath(AVR_GCC_SLUG)
	const ARDUINO_BUILDER_DIR = modulePath(ARDUINO_BUILDER_SLUG)

	// resolve the correct root path
	if (process.env.COMPILER_ROOT_DIR) {
		RUNTIME_TEMP_DIR = path.resolve(process.env.COMPILER_ROOT_DIR, TEMP_SLUG)
	} else {
		RUNTIME_TEMP_DIR = path.resolve(__dirname, TEMP_SLUG)
	}
	// if the runtime temp dir is different, copy the files there
	if (RUNTIME_TEMP_DIR !== INSTALL_TEMP_DIR) {
		try {
			await rimraf(RUNTIME_TEMP_DIR)
		} catch (e) {}
		await cpdir(INSTALL_TEMP_DIR, RUNTIME_TEMP_DIR)
	}
	console.log('RUNTIME_TEMP_DIR:', RUNTIME_TEMP_DIR)
	/*
	* Cache the necessary scripts
	*/
	SIZE_SCRIPT = (await fs.readFile(path.join(RUNTIME_TEMP_DIR, 'size.sh'))).toString()
		.split('{{HARDWARE_DIR}}').join(HARDWARE_DIR)
		.split('{{LIBRARY_DIR}}').join(LIBRARY_DIR)
		.split('{{AVR_GCC_DIR}}').join(AVR_GCC_DIR)
		.split('{{ARDUINO_BUILDER_DIR}}').join(ARDUINO_BUILDER_DIR)
		.split('{{TEMP_DIR}}').join(RUNTIME_TEMP_DIR)
		.split(process.cwd()).join('.')
	console.log(`SIZE_SCRIPT(length:${SIZE_SCRIPT.length}):\n`, SIZE_SCRIPT)

	COMPILE_SCRIPT = (await fs.readFile(path.join(RUNTIME_TEMP_DIR, 'compile.sh'))).toString()
		.split('{{HARDWARE_DIR}}').join(HARDWARE_DIR)
		.split('{{LIBRARY_DIR}}').join(LIBRARY_DIR)
		.split('{{AVR_GCC_DIR}}').join(AVR_GCC_DIR)
		.split('{{ARDUINO_BUILDER_DIR}}').join(ARDUINO_BUILDER_DIR)
		.split('{{TEMP_DIR}}').join(RUNTIME_TEMP_DIR)
		.split(process.cwd()).join('.')
	console.log(`COMPILE_SCRIPT(length:${COMPILE_SCRIPT.length}):\n`, COMPILE_SCRIPT)

	/*
	* Load bard settings
	*/
	BOARD_SETTINGS = JSON.parse(
		(await fs.readFile(path.join(RUNTIME_TEMP_DIR, 'boards.json'))).toString()
	)

	/*
	* Store the "factory program"
	*/
	database.setConfig('firmware-reset',
		(await fs.readFile(path.join(RUNTIME_TEMP_DIR, 'factory.ino.hex'))).toString()
	)

	/*
	* Store the "factory program"
	*/
	database.setConfig('firmware-booloader-updater',
		(await fs.readFile(path.join(RUNTIME_TEMP_DIR, 'bootloader_updater.ino.hex'))).toString()
	)

	/*
	* Start to recursively build
	*/
	runBuildRecursively()

	console.log('Compiler initialized')
}

const runCompile = async (code) => {
	/*
	* Write the code to disk and delete previous results
	*/
	await fs.writeFile(path.join(RUNTIME_TEMP_DIR, 'build', 'sketch', 'firmware.ino.cpp'), code)
	try {
		await fs.unlink(path.join(RUNTIME_TEMP_DIR, 'build', 'firmware.ino.elf'))
		await fs.unlink(path.join(RUNTIME_TEMP_DIR, 'build', 'firmware.ino.hex'))
	} catch (error) {
		console.log('Error deleting previous results', error)
	}

	/*
	* Run the compilation
	*/
	await execute(COMPILE_SCRIPT)

	/*
	* Read the generated hex
	*/
	return (await fs.readFile(path.join(RUNTIME_TEMP_DIR, 'build', 'firmware.ino.hex'))).toString()
}

const runSize = async () => {
	/*
	* Run the size script, and parse the results
	 *
	* The size result will be on the format like the example below:
 	* text		data	bss	    dec	    	hex
 	* 14442	146	    586		15174	   3b46
	*/
	const { stdout } = await execute(SIZE_SCRIPT)

	// We want to return ROM (text + data) and RAM (data + bss)
	let processedSize = stdout.split('\n')
	if (processedSize.length < 2) {
		throw new Error(`Invalid size string: ${stdout}`)
	}
	processedSize = processedSize[1].split('\t')
	if (processedSize.length < 5) {
		throw new Error(`Invalid size string: ${stdout}`)
	}
	processedSize = processedSize.slice(0, 3)
	processedSize = processedSize.map((item) => Number(item.replace(/\s/g, '')))
	const rom = Number(processedSize[0] + processedSize[1])
	const ram = Number(processedSize[1] + processedSize[2])
	const maxRom = Number(BOARD_SETTINGS['quirkbot.upload.maximum_size'])
	const maxRam = Number(BOARD_SETTINGS['quirkbot.upload.maximum_data_size'] * 0.8)

	if (rom > maxRom) {
		throw new Error('ROM_MAX')
	}

	if (ram > maxRam) {
		throw new Error('RAM_MAX')
	}

	return [rom, maxRom, ram, maxRam]
}

const runBuild = async (code) => {
	const hex = await runCompile(code)
	const size = await runSize()
	return {
		hex,
		size
	}
}

const runBuildRecursively = async () => {
	try {
		const { id, code } = await database.getNext()
		let hex
		let error
		let size
		try {
			({ hex, size } = await runBuild(code))
		} catch (e) {
			error = e.message
			console.log('Build error\n', error)
		}

		await database.setReady(id, hex, error, size)
		setTimeout(runBuildRecursively, 100)
	} catch (e) {
		setTimeout(runBuildRecursively, 1000)
	}
}

module.exports.install = install
module.exports.init = init
