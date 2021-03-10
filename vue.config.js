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
				productName: "WhoIntel",
				remoteBuild: false,
				electronUpdaterCompatibility: '>= 2.16',
				extraResources: ["build/alarm.wav", "build/db/*"],
				nsis: {
					include: "installer.nsh",
				},
				win: {
					artifactName: '${productName}-${version}-win64.${ext}',
					extraResources: ["build/icons/icon.ico"],
				},
				mac: {
					category: 'public.app-category.utilities',
					extraResources: ["build/icons/16x16.png"],
				},
				dmg: {
					sign: false,
					contents: [
						{
							x: 410,
							y: 150,
							type: 'link',
							path: '/Applications'
						},
						{
							x: 130,
							y: 150,
							type: 'file'
						}
					]
				},
				publish: [
					{
						"provider": "github",
					}
				]
			}
		},

		i18n: {
			locale: 'en',
			fallbackLocale: 'ru',
			localeDir: 'locales',
			enableInSFC: true
		}
	},

	devServer: {
		host: '127.0.0.1'
	},
}
