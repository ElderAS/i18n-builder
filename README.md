# i18n-builder

[![Build Status](https://travis-ci.org/ElderAS/i18n-builder.svg?branch=master&style=flat-square)](https://travis-ci.org/ElderAS/i18n-builder)
[![npm](https://img.shields.io/npm/dt/i18n-builder.svg?style=flat-square)](https://www.npmjs.com/package/i18n-builder)
[![npm](https://img.shields.io/npm/v/i18n-builder.svg?style=flat-square)](https://www.npmjs.com/package/i18n-builder)

Commandline-based tool that helps you manage i18n-language-keys in your projects.

## Installation

```
npm install --save i18n-builder
```

Run the plugin once to give the plugin access to a Google Drive. This will generate an `i18n.token.json`-file in the project root, which gives the plugin access to the Drive with the scope `https://www.googleapis.com/auth/drive.file` (you can read more about Googles OAuth 2.0 API Scopes [here](https://developers.google.com/identity/protocols/oauth2/scopes#drive)). This means it can create spreadsheets on the Drive, but only manage and delete spreadsheets created by the plugin itself. You can revoke access at any time by deleting `ì18n.token.json`.

You can run it either in the command line:

```
npx i18n
```

Or as an npm script:

```json
// package.json
{
	"scripts": {
		"i18n-cli": "i18n"
	}
}
```

```
npm run i18n-cli
```

> IMPORTANT: Before you continue, you need to create a configuration-file. Read the [Configuration-section](#configuration) to learn how.

The plugin exposes a simple CLI which supports four command-line arguments.

You can read about the `--setup` and `--new` flags in the [Configuration-section](#configuration).

`--build` tells the plugin to create translation-files from the keys and translations in your Google Spreadsheet, and put them in the directory specified by `outputDir` in your [configuration options](#options)

`--missing-keys` tells the plugin to log a list of all keys that are used in the project files, that are not defined in your Google Spreadsheet

## Configuration

For the plugin to work properly, you need to create a configuration file.

The plugin can create a default configuration file for you if you run the plugin with the `--setup` flag:

```
npx i18n --setup
```

This will create a default configuration-file called `i18n.config.json`. Keep in mind this will overwrite any `i18n.config.json` already in the project root.

If you don't have a Google Spreadsheet that the plugin has access to, you can create one by running the plugin with the `--new` flag:

```
npx i18n --new
```

This will create a Google Spreadsheet on the Drive of the Google-account the `i18n.token.json` belongs to, and automatically put the ID of the newly created spreadsheet in your `i18n.config.json`.

`IMPORTANT`: The plugin will refuse to run if it does not find a configuration file in your project root. If you do not have any existing configuration for this plugin, it is recommended to let the plugin create a configuration-file with all the necessary options by running the plugin with the flags `--setup` and `--new`:

```
npx i18n --setup --new
```

### Options

**source**: `String` _(Default: `'google'`)_:
The source of the lanugage keys. Only supported value right now is `google`.Support for local `*.csv` and `*.xlsx` will be added in a future release.

**path**: `String` _(Default: `""`)_: ID of the Google Spreadsheet where the language-keys are stored. This has to be the ID of a spreadsheet created by this plugin, and owned by the user that created the token in `i18n.token.json`.

**rules**: `Object` _(Default: `{}`)_: An object with key:value pairs of `[file-extension]: Syntax[]`, where `Syntax` is a syntax which has been used to fetch i18n-language-keys, but with the language-key replaced by a `#`. A language-key is not matched if it uses anything other than the letters in the english alphabet (`A-Z` and `a-z`), underscores(`_`), dashes(`-`) or periods(`.`).

**strict**: `Boolean` _(Default: `true`)_:
Controls whether or not to prevent building of language files if there are language-keys used in the project that are not defined in the Google Spreadsheet. This will always be `true` unless explicitly set to `false`. Simply removing the key from the configuration-file will not work.

**outputDir**: `String` _(Default: `null`)_: The directory where the translation-files the plugin generates will be written to, relative to the project root. If not specified, the plugin will write to a `dist` folder in its local directory, making it available by using `require('i18n/dist')`.

**check**: `Array` _(Default: `[]`)_: An array of directories relative to the project root in which to search for language-keys.

**ignore**: `Array` _(Default: `[]`)_: An array of directories relative to the project root the plugin will skip. `node_modules` and `.git` are always ignored.

Example:

```html
<!-- In a Vue Single-file Component, file-extension is .vue -->
<p>{{ $t("ThatsNotABoulder") }}</p>
```

```js
// In a JavaScript-file, using custom made helpers, file-extension is .js
const i18nKey = require('./utils/i18nHelper.js')
const Anotheri18nSyntax = require('./utils/someOtheri18nHelper.js')

console.log(i18nKey('Its.A_Rock--123'))
console.log(Anotheri18nSyntax('i18n/~/notSupportedSyntax'))
```

In your `i18n.config.json`:

```json
{
	"rules": {
		".vue": ["$t(\"#\")"],
		".js": ["i18nKey('#')", "Anotheri18nSyntax('#')"]
	}
}
```

With the rules above, the plugin will find the keys `ThatsNotABoulder` and `Its.A_Rock--123`, but not `i18n/~/notSupportedSyntax`, as the key contains unsupported characters.

```
IMPORTANT: The syntax can neither start nor end with #, as this could cause problems for the plugin when it looks for keys in the project files. The plugin will notify you if you use have invalid rules in your config file.
```

## License

[The MIT License](http://opensource.org/licenses/MIT)
Copyright (c) Carsten Jacobsen
