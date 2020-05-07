```json
{
	"provider": "local",
	"path": ".",
	"strict": true,
	"syntax.override.defaults": false,
	"syntaxes": {
		".js": ["$t('#')", "$tc('#',"],
		".mjml": ["{{ t \"#\" }}"]
	},
	"check": []
}
```

## Options

All options must be put in a file called `i18n.json.config` in the root of your project.

`provider` _default: 'google'_

`path` _default: root_

`strict` _default: true_

`syntax.override.defaults` _default: false_

`check` _default: [ ]_
