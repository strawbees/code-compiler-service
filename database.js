let PROGRAMS = {}
let CONFIGS = {}
let ID_FACTORY = 1

exports.create = (code) => {
	const id = ID_FACTORY++
	PROGRAMS[id] = {
		code,
		id,
		pending   : true,
		ready     : false,
		createdAt : Date.now()
	}
	return id
}
exports.countPending = () => {
	const total = Object.values(PROGRAMS).filter(p =>
		p.pending &&
		!p.ready
	).length
	exports.setConfig('pending', total)
	return total
}

exports.getNext = () => {
	let instance
	for (const program of Object.values(PROGRAMS)) {
		if (program.pending) {
			instance = program
			break
		}
	}
	if (!instance) {
		throw new Error('No pending requests')
	}

	instance.pending = false
	return instance
}
exports.setReady = (id, hex = '', error = '', size = []) => {
	for (const program of Object.values(PROGRAMS)) {
		if (program.id === id) {
			program.ready = true
			program.hex = hex
			program.size = size
			program.error = error
			break
		}
	}
	return id
}
exports.extract = (id) => {
	const program = PROGRAMS[id]
	if (program) {
		return program
	}
	throw new Error(`Cannot extract ${id}`)
}
exports.clearOld = (interval = 300000) => {
	const now = Date.now()
	Object.keys(PROGRAMS).forEach(id => {
		if ((now - PROGRAMS[id].createdAt) > interval) {
			delete PROGRAMS[id]
		}
	})
}
exports.truncate = () => {
	PROGRAMS = {}
	CONFIGS = {}
}

exports.setConfig = (key, value) =>
	CONFIGS[key] = value

exports.getConfig = (key) =>
	CONFIGS[key]

exports.removeConfig = (key) =>
	delete CONFIGS[key]
