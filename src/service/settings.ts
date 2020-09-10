import Vue from "vue"
import storageService from "@/service/storage"
import debounce from "lodash/debounce"
import Platform = NodeJS.Platform
import {ipcRenderer} from "electron"
import vuetify from "@/plugins/vuetify"
import i18n from "@/plugins/i18n"
import * as log from "electron-log"
import events from "@/service/EventBus"

export const APP_LANGUAGES = [
	{
		code: "en",
		name: "English",
	},
	{
		code: "ru",
		name: "Русский",
	},
]

class SettingsService {
	private settingsDefault = {
		alarmDistance: 3,
		alarmExpireMinutes: 10,
		alarmPopup: true,
		alarmPopupALL: false,
		alarmSound: true,
		alarmVolume: 100,
		alarmMedia: null,
		logChannels: [],
		logCleanOldInHours: 6,
		favoriteRegions: [],
		zkbEnable: false,
		favoriteZKBRegions: [],
		externalURLs: [],
		useNavigationBtn: true,
		showFleetBtn: false,
		lang: "en",
		showOverlayBtn: true,
		layoutsWindowAdvancedMode: false,
		followCharacterRegion: true,
		darkTheme: false,
	}

	settings: Vue

	platform: Platform

	constructor() {
		// NOTE sync call
		this.platform = ipcRenderer.sendSync("getPlatform")

		const settings = storageService.getObject("settings") || {}
		this.settings = new Vue({
			data: {
				settings: Object.assign(this.settingsDefault, settings)
			}
		})

		this.settings.$watch("settings", debounce(this.watcher.bind(this), 300), {deep: true})

		this.setLanguage()
		this.setTheme()

		log.info("SettingsService:load settings:", JSON.parse(JSON.stringify(this.$)))
	}

	public get $() {
		return this.settings.$data.settings
	}

	private watcher() {
		storageService.setObject("settings", this.$)
		log.info("SettingsService:save settings:", JSON.parse(JSON.stringify(this.$)))
		this.setLanguage()
		this.setTheme()
	}

	getFlatChannels(): string[] {
		return this.$.logChannels.map((channel: { [name: string]: string }) => channel.name).filter(name => name && name.length)
	}

	private setLanguage() {
		vuetify.framework.lang.current = this.$.lang
		i18n.locale = this.$.lang
	}

	private setTheme() {
		vuetify.framework.theme.dark = this.$.darkTheme
		events.$emit("setDarkTheme", this.$.darkTheme)
	}
}

const settingsService = new SettingsService()

export default settingsService
