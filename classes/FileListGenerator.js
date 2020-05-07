const fs = require('fs')
const path = require('path')

class FileListGenerator {
	/**
	 *
	 * @param {{dir: String, extensions: String[], ignore: String[]}} opts
	 */
	constructor({ dir, extensions, ignore = ['node_modules'] }) {
		this.ignore = ignore
		this.rootDir = path.resolve(dir)
		this.files = this.getAllFiles(dir, extensions)
	}
	isDirectory(path) {
		return !!fs.existsSync(path)
	}
	/**
	 * Gets filepaths of all files in directory with valid extensions
	 * @param {String} dir - Root directory to start search from
	 * @param {String[]} extensions - Valid extensions
	 */
	getAllFiles(dir, extensions) {
		if (!this.isDirectory(dir)) {
			console.error('Path', dir, 'is not a directory.')
			process.exit(0)
		}
		/**
		 * @type {String[]} - Array of filepaths to all files in directory:dir with valid extensions
		 */
		let files = []
		fs.readdirSync(dir).forEach(file => {
			let filepath = path.join(dir, file)
			let stat = fs.lstatSync(filepath)
			if (stat.isDirectory()) {
				if (!this.ignore.includes(file)) {
					let nestedFiles = this.getAllFiles(filepath, extensions)
					files = files.concat(nestedFiles)
				}
			} else {
				if (extensions.includes(path.extname(file))) files.push(filepath)
			}
		})
		return files
	}
}

module.exports = FileListGenerator
