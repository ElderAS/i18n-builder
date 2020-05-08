#!/usr/bin/env node
const { uniq, difference } = require('lodash')
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const readFilePromise = promisify(fs.readFile)
const readFile = fp =>
	readFilePromise(fp)
		.then(d => JSON.parse(d.toString()))
		.catch(err => null)
const writeFile = promisify(fs.writeFile)
const Logger = require('./classes/BadgeLogger')

const JSBuilder = require('./classes/JSGenerator')

const { ReduceToObjects, CreateSpreadsheet, ReadSpreadsheet, RegexCreator, GetCliOptions } = require('./functions')

const cliOptions = GetCliOptions()

const isDirectory = p => fs.existsSync(p) && fs.lstatSync(p).isDirectory()

function GetAllKeysInDir(dir, rules, ignore = []) {
	ignore = ignore.concat(['node_modules', '.git'])
	dir = path.resolve(dir)
	if (!fs.existsSync(dir)) {
		Logger.warning('Directory', dir, 'does not exist, skipping...')
		return []
	}
	if (!isDirectory(dir)) {
		Logger.warning('Directory', dir, 'is not a directory, skipping...')
		return []
	}

	let files = fs
		.readdirSync(dir)
		.filter(f => !ignore.includes(f))
		.map(f => path.join(dir, f))
	return uniq(GetFileKeys(files, rules)) || []
}

function GetFileKeys(files = [], rules) {
	let fileKeys = []
	files = files.filter(fs.existsSync)
	files.forEach(file => {
		if (isDirectory(file)) {
			let nestedKeys = GetAllKeysInDir(file, rules)
			fileKeys = fileKeys.concat(nestedKeys)
		}
		if (!(path.extname(file) in rules)) return
		let text = fs.readFileSync(file).toString()
		if (text) {
			rules[path.extname(file)].forEach(test => {
				let matches = text.match(test)
				fileKeys = matches ? fileKeys.concat(matches) : fileKeys
			})
		}
	})
	return fileKeys
}

async function UpdateUserConfig(CONFIG_PATH, content) {
	if (!fs.existsSync(CONFIG_PATH)) {
		await writeFile(CONFIG_PATH, '').then(() => Logger.info('Successfully created default config file.'))
	}
	await writeFile(CONFIG_PATH, JSON.stringify(content, null, '\t'))
	Logger.info('Successfully updated user config file.')
	return content
}

async function GetConfig(CONFIG_PATH) {
	CONFIG_PATH = path.resolve(CONFIG_PATH)
	return readFile(CONFIG_PATH)
		.then(async userConfig => {
			const defaultConfig = require('./i18n.default.js')
			async function CreateDefaultConfig() {
				return UpdateUserConfig(CONFIG_PATH, defaultConfig).catch(Logger.error)
			}
			if (cliOptions.setup || cliOptions.new) {
				if (cliOptions.setup) {
					Logger.info('Creating default config file...')
					userConfig = await CreateDefaultConfig()
				}
				if (cliOptions.new) {
					if (!userConfig) {
						Logger.error('No user config, use flag --setup to create a default one')
						Logger.error('Cancelling...')
						process.exit(0)
					}
					Logger.info('Creating new spreadsheet...')
					await CreateSpreadsheet('i18n Language Spreadsheet (title can be edited freely)').then(sheet => {
						Logger.info('New spreadsheet created with ID ' + sheet.spreadsheetId)
						userConfig.path = sheet.spreadsheetId
						return UpdateUserConfig(CONFIG_PATH, userConfig)
					})
				}
				process.exit(0)
			}
			if (!userConfig) {
				Logger.error('No user config, use flag --setup to create a default one')
				Logger.error('Cancelling...')
				process.exit(0)
			}
			if (!userConfig.path) {
				Logger.error(
					'No path in config file, either add the ID of an existing spreadsheet, or create a new one by adding the --new flag.',
				)
				process.exit(0)
			}
			return Object.assign(defaultConfig, userConfig)
		})
		.catch(err => {
			Logger.error('Something went wrong while trying create your config file.')
			throw err
		})
}

function SearchFiles({ check, rules, ignore }) {
	rules = RegexCreator(rules)
	let fileKeys = []
	fileKeys = check.reduce((result, dir) => {
		Logger.info('Searching in directory:', dir)
		result = result.concat(GetAllKeysInDir(dir, rules, ignore))
		return uniq(result)
	}, [])
	return fileKeys
}

async function GetTranslations({ path: id } = {}) {
	let keys = await ReadSpreadsheet(id)
	return ReduceToObjects(keys)
}

async function Build() {
	const GoogleSheetsAPI = await require('./auth/GoogleAPI')
	if (!GoogleSheetsAPI.auth) return
	let options = await GetConfig('i18n.config.json')
	Logger.info('Searching files...')
	let fileKeys = SearchFiles(options)
	Logger.info('Found', fileKeys.length, 'language-key(s) in files.')
	Logger.info('Fetching spreadsheet...')
	let translations = await GetTranslations(options)
	Logger.info('Found', translations.keys.length, 'language-key(s) in the spreadsheet.')
	if (translations.keys.length) {
		let missingKeys = difference(fileKeys, translations.keys)
		if (missingKeys.length) {
			Logger.warning('MISSING KEYS')
			Logger.warning('Found', missingKeys.length, 'language-key(s) in files that are not in the spreadsheet.')
			if (!cliOptions.showMissing) {
				Logger.warning('If you wish to see a list of missing keys, add the --missing-keys flag.')
			} else Logger.warning('Missing key(s) in spreadsheet:', missingKeys.join())
			if (options.strict !== false) {
				Logger.warning(
					'Plugin will not build with missing language keys, to disable this behaviour add "strict":false to your config file',
				)
				process.exit(0)
			}
		} else {
			Logger.info('Found no missing keys.')
		}
		if (!cliOptions.build) Logger.info('Add the --build flag to build language files.')
		else {
			Logger.info('Building files...')
			let files = JSBuilder.PrepareFiles(translations.languages)
			JSBuilder.Write(files, options.outputDir || path.join(__dirname, '/dist'))
			Logger.info('Finished building files.')
		}
	} else {
		Logger.info('No files to build, no keys in spreadsheet.')
	}
}

Build()
