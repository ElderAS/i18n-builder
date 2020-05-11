const GoogleSheetsAPI = require('../auth/GoogleAPI')
const Logger = require('../classes/BadgeLogger')

module.exports = {
	CreateSpreadsheet: title => {
		return GoogleSheetsAPI.create({
			title,
		}).then(response => {
			if (response.status > 204 || response.status < 200) throw 'Something went wrong while creating your spreadsheet.'
			return response.data
		})
	},

	ReadSpreadsheet: spreadsheetId => {
		return GoogleSheetsAPI.read(spreadsheetId, { range: 'A:Z', majorDimension: 'COLUMNS' })
			.then(data => data || [])
			.catch(err => {
				Logger.error('Something went wrong while reading the spreadsheet.')
				throw err
			})
	},
	ReduceToObjects: (data = []) => {
		let [keys = [], ...languages] = data
		let final = languages.reduce((fin, lang) => {
			let [key, ...translations] = lang
			fin[key] = translations.reduce((acc, curr, index, original) => {
				acc[keys[index + 1]] = curr
				return acc
			}, {})
			return fin
		}, {})
		return { keys: keys.slice(1), languages: final }
	},
	RegexCreator: rules => {
		if (!rules) return
		const escapeForRegex = string => {
			string = string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
			string = string.replace(/\s+/gim, '\\s*')
			return string
		}
		return Object.entries(rules).reduce((result, [extension, tests]) => {
			result[extension] = tests
				.map(test => {
					let [before, after] = test.split('#').map(escapeForRegex)
					if (!before || !after) {
						Logger.warning("An i18n syntax can neither start nor end with '#'")
						Logger.warning('This syntax is invalid:', test)
						return
					}
					let teststring = `(?<=${before})[\\w\\d._-]+(?=${after})`
					return new RegExp(teststring, 'gmi')
				})
				.filter(Boolean)
			return result
		}, {})
	},
	GetCliOptions() {
		const args = arg => process.argv.includes(arg)

		let commands = {
			new: '--new',
			build: '--build',
			setup: '--setup',
			showMissing: '--missing-keys',
		}

		for (let key in commands) {
			commands[key] = args(commands[key])
		}

		const getSheetName = () => args(commands.new) && process.argv[process.argv.indexOf(commands.new) + 1]

		return {
			...commands,
			sheetName: getSheetName(),
		}
	},
}
