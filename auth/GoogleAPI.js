const path = require('path')

const readline = require('readline')
const { promisify } = require('util')
const fs = require('fs')
const writeFile = promisify(fs.writeFile)
const readFile = path => {
	try {
		return JSON.parse(fs.readFileSync(path, { encoding: 'utf8' }))
	} catch (err) {
		return null
	}
}
const opn = require('opn')
const { google } = require('googleapis')
const Logger = require('../classes/BadgeLogger')
const SCOPES = ['https://www.googleapis.com/auth/drive.file']
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json')
const TOKEN_PATH = path.resolve('./i18n.token.json')

function ReadLinePromise(question) {
	return new Promise((resolve, reject) => {
		let rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		})
		rl.question(question, answer => {
			rl.close()
			resolve(answer)
		})
	})
}

function getCodeFromUser() {
	return new Promise((resolve, reject) => {
		Logger.info('Enter code copied from webpage:')
		ReadLinePromise('').then(ans => {
			if (!ans) {
				Logger.warning('No code provided, if you wish to cancel, press Ctrl/Cmd+C')
				getCodeFromUser().then(resolve)
			} else {
				let url = new URL(ans)
				resolve(url.searchParams.get('code'))
			}
		})
	})
}

function getAccessToken(oAuth2Client) {
	return new Promise((resolve, reject) => {
		const authUrl = oAuth2Client.generateAuthUrl({
			access_type: 'offline',
			scope: SCOPES,
		})
		Logger.info('It seems you have not yet authorized the plugin.')
		Logger.info('To allow our plugin to read your Google Sheet, we need access to your Drive-files.')
		Logger.info('We only request access to the specific document that')
		Logger.info('you configure in your i18n.config.json file.')
		Logger.info('We will now open a google-url in your browser, where you will need to')
		Logger.info('log in and allow the plugin to access your Drive-files.')
		Logger.info('After logging in you will get a code, which you will have to')
		Logger.info('paste into this terminal. You can cancel the process at any time')
		Logger.info('by pressing ^C (ctrl/cmd + C) in this terminal.')
		Logger.info('URL:', authUrl)
		Logger.info('Press enter to open the URL in your browser')
		ReadLinePromise('Waiting for your input...')
			.then(() => {
				Logger.info('Opening URL in browser...')
				return opn(authUrl)
			})
			.then(() => {
				return getCodeFromUser()
			})
			.then(code => {
				oAuth2Client.getToken = promisify(oAuth2Client.getToken)
				return oAuth2Client.getToken(code).catch(err => {
					Logger.error('Error retrieving access token, please restart the setup process to try again')
					process.exit(0)
				})
			})
			.then(token => {
				oAuth2Client.setCredentials(token)
				writeFile(TOKEN_PATH, JSON.stringify(token, null, '\t'))
				Logger.info('Successfully created Google API Token, it is stored in a JSON-file in your project folder.')
				resolve()
			})
	}).catch(err => {
		Logger.error(err)
		process.exit(0)
	})
}
class GoogleAPI {
	constructor(api, version) {
		this.api = api
		const credentials = readFile(CREDENTIALS_PATH)
		if (!credentials) {
			Logger.error('NO CREDENTIALS')
			process.exit(0)
		}
		const token = readFile(TOKEN_PATH)
		const { client_secret, client_id, redirect_uris } = credentials.installed
		const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])
		if (!token) {
			getAccessToken(oAuth2Client)
				.then(auth => this.setAuth(auth, version))
				.catch(err => Logger.error(err))
		} else {
			oAuth2Client.setCredentials(token)
			this.setAuth(oAuth2Client, version)
		}
		return this
	}

	setAuth(auth, version) {
		this.auth = auth
		this.api = google[this.api]({ version, auth })
	}
	read(spreadsheetUrl, opts = {}) {
		let id = spreadsheetUrl.match(/(?<=\/d\/|^(?!docs))[A-Za-z0-9_-]+/gim)
		if (!id || !id.length) return
		let spreadsheetId = id[0]
		return this.api.spreadsheets.values
			.get({
				spreadsheetId,
				...opts,
				auth: this.auth,
			})
			.then(res => res.data.values)
			.catch(err => {
				if (err.code === 403) {
					Logger.error('There was an error fetching the spreadsheet specified in "path" in the config file.')
					Logger.error(
						'Make sure the document belongs to the user who owns the token, and that the spreadsheet was created by this plugin.',
					)
					process.exit(0)
				} else throw err
			})
	}
	create(body) {
		return this.api.spreadsheets.create({
			auth: this.auth,
			requestBody: {
				properties: body,
			},
		})
	}
}

const API = new GoogleAPI('sheets', 'v4')

module.exports = API
