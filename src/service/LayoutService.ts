import events from "@/service/EventBus"
import {ipcRenderer} from "electron"
import store from "@/store"
import Vue from "vue"
import storageService from "@/service/storage"
import debounce from "lodash/debounce"
import find from "lodash/find"
import * as log from "electron-log"
import {v4 as uuidv4} from "uuid"
import {IWindowLayout} from "@/types/WidnowLayout"

const INITIAL_LAYOUTS: IWindowLayout[] = [
	{
		uuid: uuidv4(),
		title: "На весь экран",
		hideLogPanel: false,
		winOpacity: 100,
		winSkipTaskbar: false,
		winMaximized: true,
		winAlwaysOnTop: false,
		winIgnoreMouseEvents: false,
		hideTopPanel: false,
		winSize: [500, 500],
		winPosition: [0, 0],
		scroll: {
			top: 0,
			left: 0,
			scale: 100,
		},
	},
	{
		uuid: uuidv4(),
		title: "Прозрачное маленькое окно",
		hideLogPanel: true,
		winOpacity: 45,
		winSkipTaskbar: true,
		winMaximized: false,
		winAlwaysOnTop: true,
		winIgnoreMouseEvents: true,
		hideTopPanel: true,
		winSize: [500, 500],
		winPosition: [50, 50],
		scroll: {
			top: 0,
			left: 0,
			scale: 100,
		},
	},
]

class LayoutService {
	private readonly settings: Vue

	constructor() {
		this.settings = new Vue({
			data: {
				layouts: []
			}
		})

		this.load()
		this.settings.$watch("layouts", debounce(this.watcher.bind(this), 200), {deep: true})
	}

	get isLayoutWindow() {
		return window.location.hash === "#layouts"
	}

	private load() {
		const layouts: IWindowLayout[] = storageService.getObject("layouts") || Object.assign([], INITIAL_LAYOUTS)
		this.settings.$set(this.settings.$data, "layouts", layouts)
		this.sendLayouts()
	}

	restoreDefault() {
		this.settings.$set(this.settings.$data, "layouts", Object.assign([], INITIAL_LAYOUTS))
	}

	public get layouts(): IWindowLayout[] {
		return this.settings.$data.layouts
	}

	private watcher() {
		storageService.setObject("layouts", this.layouts)
		this.sendLayouts()
	}

	private sendLayouts() {
		const layouts_export = this.layouts.map(layout => {
			return {
				uuid: layout.uuid,
				title: layout.title,
			}
		})

		if (this.isLayoutWindow) {
			ipcRenderer.send("window:layouts:refresh")
		} else {
			ipcRenderer.send("window:layouts", layouts_export)
		}
	}

	init() {
		events.$on("electron:window:layouts:apply:request", (event, uuid: string) => this.apply(uuid))
		events.$on("electron:window:layouts:refresh", this.load.bind(this))
	}

	apply(uuid: string) {
		let layout: IWindowLayout
		if (!uuid) {
			layout = INITIAL_LAYOUTS[0]
		} else {
			layout = find(this.layouts, {uuid}) || INITIAL_LAYOUTS[0]
		}

		if (!layout) {
			log.warn("LayoutService: apply: not found:", uuid)
			return
		}

		ipcRenderer.send("window:layouts:apply", layout)

		events.$emit("regionMap:set:scroll", layout.scroll)
		store.commit("setShowLogsPanel", !layout.hideLogPanel)
		store.commit("setShowTopPanel", !layout.hideTopPanel)
	}

	addNew() {
		this.layouts.push({
			uuid: uuidv4(),
			title: "New Layout",
			hideLogPanel: false,
			winOpacity: 100,
			winSkipTaskbar: false,
			winMaximized: true,
			winAlwaysOnTop: false,
			winIgnoreMouseEvents: false,
			hideTopPanel: false,
			winSize: [500, 500],
			winPosition: [0, 0],
			scroll: {
				top: 0,
				left: 0,
				scale: 100,
			},
		})
	}
}

const layoutService = new LayoutService()

export default layoutService
