const path = require('path')
const fs = require('fs').promises
const rimraf = require('./utils/rimraf')

const keepInDir = async (dirPath, keep) => {
	try {
		await fs.access(dirPath)
		const list = await fs.readdir(dirPath)
		await Promise.all(list.map(async (entry) => {
			if (keep.indexOf(entry) !== -1) {
				return
			}
			const entryPath = path.join(dirPath, entry)
			await rimraf(entryPath)
		}))
	} catch (e) {
		console.log('error running keepInDir', e)
	}
}
const removeFromDir = async (dirPath, remove) => {
	try {
		await fs.access(dirPath)
		const list = await fs.readdir(dirPath)
		await Promise.all(list.map(async (entry) => {
			if (remove.indexOf(entry) === -1) {
				return
			}
			const entryPath = path.join(dirPath, entry)
			await rimraf(entryPath)
		}))
	} catch (e) {
		console.log('error running removeFromDir', e)
	}
}

module.exports = async ({
	libraryDir,
	hardwareDir,
	arduinoBuilderDir,
	avrGccDir
}) => {
	// free to remove whole directory
	console.log('removing', libraryDir)
	await rimraf(libraryDir)
	console.log('removing', hardwareDir)
	await rimraf(hardwareDir)
	console.log('removing', arduinoBuilderDir)
	await rimraf(arduinoBuilderDir)
	console.log('removing', avrGccDir)
	// for avr-gcc we need to cherry pick what to remove
	await keepInDir(avrGccDir,[
		'tools'
	])
	await removeFromDir(path.join(avrGccDir, 'tools', 'avr'),[
		'include',
		'builtin_tools_versions.txt'
	])
	await keepInDir(path.join(avrGccDir, 'tools', 'avr', 'avr', 'bin'),[
		'as',
		'ld',
		'as.exe',
		'ld.exe',
	])
	await keepInDir(path.join(avrGccDir, 'tools', 'avr', 'avr', 'lib'),[
		'avr5',
		'ldscripts'
	])
	await keepInDir(path.join(avrGccDir, 'tools', 'avr', 'avr', 'lib', 'avr5'),[
		'crtatmega32u4.o',
		'libatmega32u4.a',
		'libc.a',
		'libm.a'
	])
	await keepInDir(path.join(avrGccDir, 'tools', 'avr', 'avr', 'lib', 'ldscripts'),[
		'avr5.xn'
	])

	await keepInDir(path.join(avrGccDir, 'tools', 'avr', 'bin'),[
		'avr-g++',
		'avr-gcc',
		'avr-objcopy',
		'avr-size',
		'avr-g++.exe',
		'avr-gcc.exe',
		'avr-objcopy.exe',
		'avr-size.exe',
	])
	await keepInDir(path.join(avrGccDir, 'tools', 'avr', 'lib'),[
		'gcc',
	])
	await keepInDir(path.join(avrGccDir, 'tools', 'avr', 'lib', 'gcc', 'avr', '5.4.0'),[
		'avr5',
		'device-specs',
	])
	await keepInDir(path.join(avrGccDir, 'tools', 'avr', 'lib', 'gcc', 'avr', '5.4.0', 'device-specs'),[
		'specs-atmega32u4',
		'specs-avr5',
	])
	await keepInDir(path.join(avrGccDir, 'tools', 'avr', 'libexec', 'gcc', 'avr', '5.4.0'),[
		'cc1plus',
		'liblto_plugin.so',
		'lto-wrapper',
		'lto1',
		'cc1plus.exe',
		'liblto_plugin-0.dll',
		'liblto_plugin.dll.a',
		'liblto_plugin.la',
		'lto-wrapper.exe',
		'lto1.exe',
	])
}
