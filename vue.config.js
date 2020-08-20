const electronBuilderPublishOptions = require("./vue.electronBuilderPublish.config")

module.exports = {
	lintOnSave: false,
	transpileDependencies: [
		'vuetify'
	],
	configureWebpack: {
		devtool: 'source-map',
		target: 'electron-renderer'
	},
	pluginOptions: {
		electronBuilder: {
			mainProcessWatch: ['src/background/*'],
			builderOptions: {
				appId: 'space.whointel.app',
				remoteBuild: false,
				electronUpdaterCompatibility: '>= 2.16',
				win: {
					artifactName: '${productName}-${version}-win64.${ext}',
				},
				mac: {
					category: 'public.app-category.utilities',
				},
				dmg: {
					sign: false,
				},
				publish: electronBuilderPublishOptions
			}
		}
	},

	devServer: {
		host: '127.0.0.1'
	},
}
