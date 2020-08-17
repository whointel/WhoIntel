const electronBuilderPublishOptions = require("./vue.electronBuilderPublish.config")

module.exports = {
	"lintOnSave": false,
	"transpileDependencies": [
		"vuetify"
	],
	configureWebpack: {
		devtool: 'source-map',
		target: 'electron-renderer'
	},
	pluginOptions: {
		electronBuilder: {
			mainProcessWatch: ['src/background/*'],
			builderOptions: {
				appId: 'ru.up55.whointel',
				win: {
					artifactName: '${productName}-${version}-win64.${ext}',
				},
				publish: electronBuilderPublishOptions
			}
		}
	},

	devServer: {
		host: '127.0.0.1'
	},
}
