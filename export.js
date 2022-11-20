#!/usr/bin/env node

const fs = require('fs').promises
const Excel = require('exceljs')

async function handleGoogleSheet(sheets, options) {
	try {
		const { data } = await sheets.spreadsheets.get({
			spreadsheetId: options.spreadsheetId,
			ranges: [options.sheetName],
			includeGridData: true,
		})

		const [header, ...rows] = data.sheets[0].data[0].rowData
		const spotIndex = header.values.findIndex(({ formattedValue }) => formattedValue.toLowerCase() === 'spot')
		const sourceIndex = header.values.findIndex(
			({ formattedValue }) => formattedValue.toLowerCase() === options.sourceLanguage.toLowerCase(),
		)
		const targetIndex = header.values.findIndex(
			({ formattedValue }) => formattedValue.toLowerCase() === options.targetLanguage.toLowerCase(),
		)

		return rows
			.map(({ values }) => values)
			.filter(row => {
				const { userEnteredValue, effectiveFormat } = row[targetIndex] || {}
				return !userEnteredValue || !Object.values(effectiveFormat.backgroundColor).every(e => e === 1)
			})
			.map(row => {
				return {
					key: row[spotIndex].formattedValue,
					source: row[sourceIndex]?.userEnteredValue?.stringValue || '',
					target: row[targetIndex]?.userEnteredValue?.stringValue || '',
				}
			})
	} catch (error) {
		console.log('ERROR:handleGoogleSheet', error)
		throw error
	}
}

const createFile = async (data, options) => {
	const workbook = new Excel.Workbook({ useStyles: true })
	workbook.creator = 'Kvass'

	const sheet = workbook.addWorksheet(`${options.sourceLanguage} - ${options.targetLanguage}`)

	sheet.addRow(['spot', options.sourceLanguage, options.targetLanguage])

	data.forEach(({ key, source, target }) => sheet.addRow([key, source, target]))

	await workbook.xlsx.writeFile(`Kvass-${options.sourceLanguage}-${options.targetLanguage}.xlsx`)
}

const main = async () => {
	try {
		const options = {
			spreadsheetId: JSON.parse(await fs.readFile('i18n.config.json')).path,
			sourceLanguage: 'nb',
			targetLanguage: process.argv.slice(2).pop(),
		}

		if (!options.targetLanguage) return console.log('Exiting: Target language is missing...')
		if (!options.spreadsheetId) return console.log('Exiting: Spreadsheet ID is missing...')

		console.log('Authenticating')

		const Sheets = await require('./auth/GoogleAPI')

		if (!Sheets.auth) return console.log('Exiting: Authentication failed...')

		options.sheetName = (
			await Sheets.api.spreadsheets.get({
				spreadsheetId: options.spreadsheetId,
				auth: Sheets.auth,
				ranges: [],
			})
		).data.sheets[0].properties.title

		console.log('Getting source items')
		const source = await handleGoogleSheet(Sheets.api, options)

		console.log('Done getting source items')
		console.log('Creating file')
		await createFile(source, options)
		console.log('File created')
	} catch (error) {
		console.log('Exiting: ', error)
		process.exit(0)
	}
}

main()
