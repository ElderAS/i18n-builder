class RegexGenerator {
	/**
	 * @param {Object} Syntaxes
	 */
	constructor(syntaxes) {
		this.keyFormat = '#'
		this.Extensions = {}
		for (let syntax of Object.entries(syntaxes)) {
			let [ext, stx] = syntax
			this.Extensions[ext] = {
				tests: stx.map(s => this.generateRegex(s)),
			}
		}
	}
	generateRegex(syntax) {
		if (Array.isArray(syntax)) return syntax.map(s => this.generateRegex(s))

		let regexArr = syntax.split(this.keyFormat)
		regexArr = regexArr.map(this.escapeForRegex)
		let [before, after] = regexArr
		if (!before || !after) {
			console.error('ERR: Syntax definition can not end or start with #')
			process.exit(1)
		}
		return {
			syntax,
			regex: new RegExp(`(?<=${before})([\\w\\d.]+)(?=${after})`, 'gim'),
		}
	}
	escapeForRegex(string) {
		string = string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		string = string.replace(/\s+/g, '\\s*')
		return string
	}
}

module.exports = RegexGenerator
