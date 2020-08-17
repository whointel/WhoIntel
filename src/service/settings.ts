import Vue from "vue"
import storageService from "@/service/storage"
import debounce from "lodash/debounce"

class SettingsService {
	private settingsDefault = {
		alarmDistance: 3,
		alarmExpireMinutes: 10,
		alarmPopup: true,
		alarmSound: true,
		alarmVolume: 100,
		alarmMedia: null,
		logChannels:  [],
		favoriteRegions: [],
		zkbEnable: false,
		favoriteZKBRegions: [],
		externalURLs: [],
		useNavigationBtn: true,
		showFleetBtn: false,
		showOverlayBtn: true,
		layoutsWindowAdvancedMode: false,
		followCharacterRegion: true,
	}

	settings: Vue

	constructor() {
		const settings = storageService.getObject("settings") || {}
		this.settings = new Vue({
			data: {
				settings: Object.assign(this.settingsDefault, settings)
			}
		})

		this.settings.$watch("settings", debounce(this.watcher.bind(this), 300), {deep: true})
	}

	public get $() {
		return this.settings.$data.settings
	}

	private watcher() {
		storageService.setObject("settings", this.$)
	}
}

const settingsService = new SettingsService()

export default settingsService
