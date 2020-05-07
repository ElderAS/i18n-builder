// @ts-nocheck

const colors = {
	reset: '\x1b[0m',
	fg: {
		black: '\x1b[30m',
		red: '\x1b[31m',
		green: '\x1b[32m',
		yellow: '\x1b[33m',
		blue: '\x1b[34m',
		magenta: '\x1b[35m',
		cyan: '\x1b[36m',
		white: '\x1b[37m',
	},
	bg: {
		black: '\x1b[40m',
		red: '\x1b[41m',
		green: '\x1b[42m',
		yellow: '\x1b[43m',
		blue: '\x1b[44m',
		magenta: '\x1b[45m',
		cyan: '\x1b[46m',
		white: '\x1b[47m',
	},
}

const consolethemes = {
	default: colors.fg.white + colors.bg.blue,
	info: colors.fg.white + colors.bg.magenta,
	reset: colors.reset,
	warning: colors.fg.black + colors.bg.yellow,
	error: colors.fg.white + colors.bg.red,
}

class BadgeLogger {
	constructor(prefix, badgeArr = []) {
		this.colors = colors
		this.themes = consolethemes
		this.badges = this.BuildBadges(badgeArr, prefix)
		this.prefixBadge = this.badges.default
		this.log = this.log.bind(this.log, this.prefixBadge, this.badges, this.themes)
		Object.keys(this.badges).forEach(b => {
			this.log[b] = this.log.bind(this.log, b)
		})
		return this.log
	}

	BuildBadges(badgeArr = [], prefix) {
		let defaultBadge = `${this.themes.default} ${prefix || 'INFO'} ${this.colors.reset} `
		let badges = { default: defaultBadge }
		if (!badgeArr.length) return badges
		return Object.assign(
			badges,
			badgeArr.reduce((res, curr) => {
				let { name, theme, text, prefix } = curr
				if (!name) name = theme
				if (!/[a-zA-Z0-9]/.test(name)) name = theme
				if (!text) text = name.toUpperCase()
				if (res[name]) return res
				if (!(theme in this.themes)) theme = this.themes.default
				else theme = this.themes[theme]
				res[name] = `${theme} ${text} ${this.colors.reset} `
				return res
			}, {}),
		)
	}

	log(prefixBadge, badges, themes, type = 'info', ...text) {
		text = text.join(' ')
		let badge = badges[type] || ''
		let theme = themes[type] || ''
		console.log(`${prefixBadge}${badge}${text}`)
	}
}

const Logger = new BadgeLogger('i18n', [
	{
		theme: 'info',
	},
	{
		theme: 'warning',
	},
	{
		theme: 'error',
	},
])

module.exports = Logger
