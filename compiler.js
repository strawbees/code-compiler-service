const fs = require('fs').promises
const path = require('path')
const database = require('./database')
const cpdir = require('./utils/cpdir')
const execute = require('./utils/execute')
const modulePath = require('./utils/modulePath')
const rimraf = require('./utils/rimraf')

/**
 * Create control variables
**/
const TEMP_SLUG            = '_tmp_compiler'
const FIRMWARE_SLUG        = 'firmware'
const HARDWARE_SLUG        = 'quirkbot-arduino-hardware'
const LIBRARY_SLUG         = 'quirkbot-arduino-library'
const AVR_GCC_SLUG         = 'quirkbot-avr-gcc'
const ARDUINO_BUILDER_SLUG = 'quirkbot-arduino-builder'

const ROOT_DIR            = process.env.COMPILER_BUILD_ROOT || process.env.BUILD_ROOT || './'
const TEMP_DIR            = path.resolve(ROOT_DIR, TEMP_SLUG)
const FIRMWARE_DIR        = path.resolve(__dirname, FIRMWARE_SLUG)
const HARDWARE_DIR        = modulePath(HARDWARE_SLUG)
const LIBRARY_DIR         = modulePath(LIBRARY_SLUG)
const AVR_GCC_DIR         = modulePath(AVR_GCC_SLUG)
const ARDUINO_BUILDER_DIR = modulePath(ARDUINO_BUILDER_SLUG)

/**
 * The computed script that calculates the size of the .hex
**/
const SIZE_SCRIPT = `"${path.join(AVR_GCC_DIR, 'tools', 'avr', 'bin', 'avr-size')}" "${path.join(TEMP_DIR, 'firmware.ino.elf')}"`

/**
 * The computed compile script
**/
let COMPILE_SCRIPT

/**
 * The computed board settings
**/
const BOARD_SETTINGS = {}

const init = async () => {

	/**
	 * Clean up temporary directories
	**/
	try {
		await fs.mkdir(TEMP_DIR)
	} catch (e) {}

	/**
	 * Exctract the board settingds
	**/
	const boardsTxt = (await fs.readFile(path.join(HARDWARE_DIR, 'avr', 'boards.txt'))).toString()
	boardsTxt.split('\n').forEach((line) => {
		const parts = line.split('=')
		if (parts.length === 2) {
			const [key, value] = parts
			BOARD_SETTINGS[key] = value
		}
	})

	/**
	 * Make an initial compilation of the "factory program" using
	 * arduino-builder, so we can extract the build steps, exactly the same way
	 * arduino does it.
	**/
	const { stdout : arduinoBuilderOutput } = await execute(
		'"' + path.join(ARDUINO_BUILDER_DIR, 'tools', 'arduino-builder') + '" ' +
		'-hardware="'   + 'node_modules' + '" ' +
		'-libraries="'  + 'node_modules' + '" ' +
		'-hardware="'   + path.join(ARDUINO_BUILDER_DIR, 'tools', 'hardware') + '" ' +
		'-tools="'      + path.join(AVR_GCC_DIR, 'tools') + '" ' +
		'-tools="'      + path.join(ARDUINO_BUILDER_DIR, 'tools', 'tools') + '" ' +
		'-fqbn="'       + HARDWARE_SLUG + ':avr:quirkbot" ' +
		'-ide-version=' + '10607 ' +
		'-build-path="' + TEMP_DIR + '" ' +
		'-verbose ' +
		'"' + path.join(FIRMWARE_DIR, 'firmware.ino') + '"'
	)
	// /**
	//  * Precompile header
	// **/
	// const precompileHeaderScript = (
	// 	arduinoBuilderOutput
	// 	.split('\n')
	// 	.filter(line => line.indexOf('firmware.ino.cpp.o') !== -1)
	// 	[0]
	// 	.split(path.join(TEMP_DIR, 'sketch', 'firmware.ino.cpp'))
	// 	.join(path.join(LIBRARY_DIR, 'src', 'Quirkbot.h'))
	// 	.split(path.join(LIBRARY_DIR, 'src', 'Quirkbot.h.o'))
	// 	.join(path.join(LIBRARY_DIR, 'src', 'Quirkbot.h.gch'))
	// )

	/**
	 * Compose the build script
	**/
	COMPILE_SCRIPT = (
		[
			arduinoBuilderOutput
			.split('\n')
			.filter(line =>
				line.indexOf('firmware.ino.cpp.o') !== -1
			)[0],
			arduinoBuilderOutput
			.split('\n')
			.filter(line => line.indexOf('firmware.ino.elf') !== -1)
			.filter(line => line.indexOf('firmware.ino.eep') === -1)
			.join('\n')
		].join('\n')
	)

	/**
	 * Store the "factory program"
	**/
	database.setConfig('firmware-reset',
		await fs.readFile(path.join(TEMP_DIR, 'firmware.ino.hex'))
	)

	/**
	 * Store the library config
	**/
	database.setConfig('library-info',
		await fs.readFile(path.join(LIBRARY_DIR, 'library.properties'))
	)

	/**
	 * Store the hardware config
	**/
	database.setConfig('hardware-info',
		await fs.readFile(path.join(HARDWARE_DIR, 'avr', 'version.txt'))
	)

	/**
	 * Start to recursively build
	**/
	recursivelyBuild()

	console.log('Compiler ready')
}

const runCompile = async (code) => {
	/**
	 * Write the code to disk
	**/
	await fs.writeFile(path.join(TEMP_DIR, 'sketch', 'firmware.ino.cpp'), code)

	/**
	 * Run the compilation
	**/
	await execute(COMPILE_SCRIPT)

	/**
	 * Read the generated hex
	**/
	return (await fs.readFile(path.join(TEMP_DIR, 'firmware.ino.hex'))).toString()
}

const runSize = async () => {
	/**
	 * Run the size script, and parse the results
	 *
	 * The size result will be on the format like the example below:
 	 * text		data	bss	    dec	    	hex
 	 * 14442	146	    586		15174	   3b46
	**/
	const { stdout } = await execute(SIZE_SCRIPT)

	// We want to return ROM (text + data) and RAM (data + bss)
	let  processedSize = stdout.split('\n')
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

	if (rom > maxRom){
		throw 'ROM_MAX'
		return
	}

	if (ram > maxRam){
		throw 'RAM_MAX'
		return
	}

	return [ rom, maxRom, ram, maxRam ]
}

const build = async (code) => {
	const hex = await runCompile(code)
	const size = await runSize()
	return {
		hex,
		size
	}
}

const recursivelyBuild = async () => {
	try {
		const { id, code } = await database.getNext()
		let hex
		let error
		let size
		try {
			const result = await build(code)
			hex = result.hex
			size = result.size
		} catch (e) {
			error = e.message
		}

		await database.setReady(id, hex, error, size)
		setTimeout(recursivelyBuild, 100)
	} catch (e) {
		setTimeout(recursivelyBuild, 1000)
	}
}

init()
