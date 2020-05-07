const path = require('path')
const fs = require('fs')
const Logger = require('./BadgeLogger')

class JSGenerator {
	static PrepareFiles(files = {}) {
		return Object.entries(files).map(([filename, content]) => ({
			filename: filename + '.js',
			content: `module.exports = ${JSON.stringify(content, null, '\t')}`,
		}))
	}
	static Write(files = [], targetDir = path.join(__dirname, 'dist')) {
		let indexFile = {
			filename: 'index.js',
			content: `const fs = require('fs')
const path = require('path')

let files = fs.readdirSync(path.resolve(__dirname))

files = files.filter(f => f !== 'index.js')

module.exports = files
`,
		}
		files = files.concat(indexFile)
		if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir)
		files.forEach(f => {
			fs.writeFileSync(path.join(targetDir, f.filename), f.content)
		})
	}
}

module.exports = JSGenerator
