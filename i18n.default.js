module.exports = {
	source: 'google',
	path: '',
	strict: true,
	'override.default.rules': false,
	rules: {
		'.js': ["$t('#'", "$tc('#'"],
		'.mjml': ['{{ t "#" }}'],
	},
	check: [],
	ignore: ['node_modules'],
}
