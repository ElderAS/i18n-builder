const Logger = require('../classes/BadgeLogger')
const assocPath = require('ramda').assocPath

const isSafe = (path, current) => {
	if (!current) return true
	let end = ''
	let pattern = path.split('.').reduce((res, cur, index) => {
		if (!index) return (res += cur)
		res += '(.' + cur + ''
		end += ')?'
		return res
	}, '^')

	pattern += end + '$'

	return !new RegExp(pattern, 'gm').test(current)
}

module.exports = {
	isSafe,
	CreateSpreadsheet: title => {
		const GoogleSheetsAPI = require('../auth/GoogleAPI')
		return GoogleSheetsAPI.create({
			title,
		}).then(response => {
			if (response.status > 204 || response.status < 200) throw 'Something went wrong while creating your spreadsheet.'
			return response.data
		})
	},

	ReadSpreadsheet: spreadsheetId => {
		const GoogleSheetsAPI = require('../auth/GoogleAPI')
		return GoogleSheetsAPI.read(spreadsheetId, { range: 'A:Z', majorDimension: 'COLUMNS' })
			.then(data => data || [])
			.catch(err => {
				Logger.error('Something went wrong while reading the spreadsheet.')
				throw err
			})
	},
	ReduceToObjects: (data = []) => {
		let [keys = [], ...languages] = data
		keys = keys.slice(1)

		return {
			keys,
			languages: languages.reduce((res, col) => {
				let [locale, ...translations] = col
				let processed = ''

				res[locale] = translations.reduce((langObj, value, i) => {
					let key = keys[i]

					if (!isSafe(key, processed)) {
						Logger.warning('Conflict at:', key, '-> Skipping')
						return langObj
					}
					processed += key + '\n'

					return assocPath(keys[i].split('.'), value, langObj)
				}, {})

				return res
			}, {}),
		}
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
