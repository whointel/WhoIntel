import Vue from "vue"
import {ipcRenderer} from "electron"

export enum EventBusEvents {
	showRegionMapNewEden = "showRegionMapNewEden",
	setRegionMap = "setRegionMap",
	updateCurrentRegion = "updateCurrentRegion",
	hideRegionMapNewEden = "hideRegionMapNewEden",
	"systemManager:ready" = "systemManager:ready",
	"JB:ready" = "JB:ready",
	showNewEden = "showNewEden",
}

class EventBus {
	private eventBus: Vue
	private originalEmit: any

	constructor() {
		this.eventBus = new Vue()
	}

	init() {
		this.originalEmit = ipcRenderer.emit
		const self = this

		ipcRenderer.emit = function(channel, event, ...args) {
			self.$emit(`electron:${channel as string}`, event, ...args)
			return self.originalEmit.apply(ipcRenderer, arguments)
		}
	}

	sendToMain(event: string, args: any) {
		ipcRenderer.send("sendto:main", event, args)
	}

	sendToLayouts(event: string, args: any) {
		ipcRenderer.send("sendto:layouts", event, args)
	}

	$on(event: string | string[], callback: Function) {
		this.eventBus.$on(event, callback)
	}

	$off(event: string | string[], callback: Function) {
		this.eventBus.$off(event, callback)
	}

	$emit(event: string, ...args: any[]) {
		setTimeout(() => {
			this.eventBus.$emit(event, ...args)
		}, 10)
	}
}

const events = new EventBus()

export default events
