import "@/scss/_fonts.scss"
import {ipcRenderer} from "electron"
import * as log from "electron-log"
import Vue from "vue"
import App from "@/App.vue"
import LayoutWindow from "@/LayoutWindow.vue"
import store from "@/store"
import vuetify from "@/plugins/vuetify"
import PortalVue from "portal-vue"
import api from "@/lib/EVEApi"
import events from "@/service/EventBus"
import eveStats from "@/service/EVEStats"
import logReader from "@/service/LogReader"
import zkillboard from "@/service/ZKillboard"
import systemManager from "@/service/SystemManager"
import timeUsedService from "@/service/TimeUsed"
import settingsService from "@/service/settings"
import layoutService from "@/service/LayoutService"
import VueCompositionAPI from '@vue/composition-api'
import characterManager from "@/service/CharacterManager"
import pathService from "@/service/PathService"

declare global {
	interface Window {
		require: any;
	}
}
Vue.config.productionTip = false

Vue.use(VueCompositionAPI)
Vue.use(PortalVue)

events.init()

if (!layoutService.isLayoutWindow) {
	api.init()
	pathService.init()
	characterManager.init()
	zkillboard.init()
	eveStats.init()
	systemManager.init()
	logReader.init()

	timeUsedService.init()
	layoutService.init()

	ipcRenderer.send("logReader:setChannels", settingsService.getFlatChannels())

	setInterval(() => {
		// @ts-ignore
		const memoryUsage = JSON.parse(JSON.stringify(window.performance.memory, ['totalJSHeapSize', 'usedJSHeapSize', 'jsHeapSizeLimit']))
		if (process.env.NODE_ENV === 'production') {
			log.info("memory usage", memoryUsage)
		}
	}, 60000);

	new Vue({
		store,
		vuetify,
		render: h => h(App)
	}).$mount("#app")
} else {

	new Vue({
		store,
		vuetify,
		render: h => h(LayoutWindow)
	}).$mount("#app")
}
