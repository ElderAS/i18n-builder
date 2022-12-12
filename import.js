#!/usr/bin/env node

const fs = require('fs').promises
const process = require('process')
const ExcelJS = require('exceljs')

const excelColumns = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
let sourceIndex = -1

async function parseArguments() {
	try {
		const [filePath, locale] = process.argv.slice(2)
		if (!filePath || !locale) throw new Error(`Missing arguments for path or locale`)
		const file = await fs.readFile(filePath)
		return {
			file,
			locale: locale.toLowerCase(),
		}
	} catch (error) {
		console.log('Error:parseArguments', error)
	}
}

function googleToFileMap(source, target, locale) {
	return Object.fromEntries(
		Object.entries(target)
			.map(([key, value]) => {
				const sourceKey = source[key]
				const targetValue = value[locale]
				if (!sourceKey) throw new Error(`Key does not exist in source: ${key}, locale: ${locale}`)

				if (sourceKey[locale] === targetValue && targetValue) {
					console.log('   Skipped: ', targetValue)

					return null
				}
				return [key, { [locale]: targetValue, row: source[key].row }]
			})
			.filter(Boolean),
	)
}

function setSourceIndex({ row, locale }) {
	const language = row.find(language => language === locale)
	sourceIndex = row.findIndex(language => language === locale)

	if (!language || sourceIndex <= 0)
		throw new Error(`Check source. Trying to translate [${locale}] but source only have [${row.join(', ')}]`)
}

async function handleGoogleSheet(sheets, locale, options) {
	try {
		const res = await sheets.spreadsheets.values.get({
			spreadsheetId: options.spreadsheetId,
			range: options.sheetName,
			majorDimension: 'rows',
		})

		return Object.fromEntries(
			res.data.values.map((row, rowNumber) => {
				const [key, ...translations] = row
				if (rowNumber === 0) {
					setSourceIndex({ row, locale })
				}
				return [
					key,
					{
						[locale]: row[sourceIndex],
						row: rowNumber + 1,
					},
				]
			}),
		)
	} catch (error) {
		console.log('ERROR:handleGoogleSheet', error)
		throw error
	}
}

const handleTranslationFile = async (file, locale, options) => {
	try {
		const workbook = new ExcelJS.Workbook()
		const translation = await workbook.xlsx.load(file)
		const sheet = translation.getWorksheet(1)
		const transformedData = {}

		let columnIndex = -1

		sheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
			const cleaned = row.values.filter(Boolean)
			const [empty, key, ...translations] = row.values

			if (!key) return

			if (!row.hidden) {
				if (rowNumber === 1) {
					const visibleColumns = row.values.filter((_, index) => !sheet.getColumn(index)?.hidden)

					if (visibleColumns.length !== row.values.length && !visibleColumns.includes(locale)) {
						throw new Error(
							`Check target file. Trying to translate [${locale}] but visible languages are [${visibleColumns.join(
								', ',
							)}]`,
						)
					}

					columnIndex = row.values.findIndex(translation => translation === locale)
				}

				transformedData[key] = {
					[locale]: row.values[columnIndex],
					row: rowNumber,
				}
			}
		})
		return transformedData
	} catch (error) {
		console.log('ERROR:handleTranslationFile', error)
		throw error
	}
}

const setCellBody = (rowIndex, columnIndex, value) => ({
	updateCells: {
		range: {
			startRowIndex: rowIndex - 1,
			endRowIndex: rowIndex,
			startColumnIndex: columnIndex,
			endColumnIndex: columnIndex + 1,
		},
		rows: [
			{
				values: [
					{
						userEnteredValue: {
							stringValue: value.text,
						},
						userEnteredFormat: {
							backgroundColorStyle: {
								rgbColor: value.color,
							},
						},
					},
				],
			},
		],
		fields: '*',
	},
})

const update = async (sheets, values, locale, options) => {
	try {
		const column = `${options.sheetName}!${excelColumns[sourceIndex]}`

		console.log(`Updating ${Object.values(values).length} entries at column [${excelColumns[sourceIndex]}]`)

		const requests = Object.values(values).map(value => {
			const text = value[locale]
			const row = value['row']

			let val = {
				text: '',
				color: { red: 0.4, green: 0.8, blue: 0.8 },
			}

			if (typeof text === 'object') {
				val.text = `${JSON.stringify(text)}`
				val.color = { red: 1, green: 0.2, blue: 0.2 }
			} else if (text === undefined || text === null || !text) {
				val.text = ''
			} else {
				val.text = `${text}`
			}
			return setCellBody(row, sourceIndex, val)
		})

		const result = await sheets.spreadsheets.batchUpdate({
			spreadsheetId: options.spreadsheetId,
			resource: {
				requests,
			},
		})
		console.log(`Updated ${result?.data?.replies?.length} entries `)
	} catch (error) {
		console.log('ERROR:update', error)
		throw error
	}
}

const main = async (options = {}) => {
	try {
		const { path: spreadsheetId } = JSON.parse(await fs.readFile('i18n.config.json'))
		if (!spreadsheetId) {
			console.log('spreadsheetId is missing')
			throw 'spreadsheetId is missing'
		}
		options.spreadsheetId = spreadsheetId
		console.log('Starting')
		const { file, locale } = await parseArguments(options)
		console.log('Authenticating')
		const GoogleSheetsAPI = await require('./auth/GoogleAPI')
		if (!GoogleSheetsAPI.auth) return console.log('Authentication failed...')

		const sheets = GoogleSheetsAPI.api

		options.sheetName = (
			await sheets.spreadsheets.get({
				spreadsheetId,
				ranges: [],
				auth: GoogleSheetsAPI.auth,
			})
		).data.sheets[0].properties.title

		console.log('Getting source items')
		const source = await handleGoogleSheet(sheets, locale, options)
		console.log('Done getting source items')
		console.log('Getting target items')
		const target = await handleTranslationFile(file, locale, options)
		console.log('Done getting target items')
		console.log('Mapping')
		const mappedData = googleToFileMap(source, target, locale)
		console.log('Done mapping')
		console.log('Updating')
		await update(sheets, mappedData, locale, options)
		console.log('Done updating')
	} catch (error) {
		console.log(error)
		process.exit(0)
	}
}

main()
