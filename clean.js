const path = require('path')
const fs = require('fs')

let distpath = path.resolve(__dirname, './dist')
let files = fs.readdirSync(distpath)
files = files.filter(f => f !== 'index.js')
files.forEach(file => {
	let filepath = path.join(distpath, file)
	fs.unlinkSync(filepath)
})
