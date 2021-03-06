import events from "@/service/EventBus"
import systemManager from "@/service/SystemManager"
import Vue from "vue"
import EVERegion from "@/lib/EVERegion"
import {watch} from "@vue/composition-api"

class HistoryService {
	constructor() {
		events.$on("btn:back", this.historyBack.bind(this))
		events.$on("btn:forward", this.historyForward.bind(this))

		watch(() => systemManager.currentRegion, (region) => {
			this.historyAdd(region as EVERegion)
		})
	}

	public regionHistory: number[] = []
	public regionHistoryShift = -1
	private regionHistoryChanging = false

	private historyAdd(region: EVERegion) {
		if (!region) return

		if (this.regionHistoryChanging) return
		if (this.regionHistory[this.regionHistory.length - 1 - this.regionHistoryShift] === region.id) return

		this.regionHistory.splice(this.regionHistory.length - this.regionHistoryShift)
		this.regionHistoryShift = 0
		this.regionHistory.push(region.id)
		if (this.regionHistory.length > 20) {
			this.regionHistory.splice(0, this.regionHistory.length - 20)
		}
	}

	public async historyBack() {
		if (this.regionHistoryShift >= (this.regionHistory.length - 1)) return

		this.regionHistoryShift++
		this.regionHistoryChanging = true
		await systemManager.setCurrentRegion(
			this.regionHistory[this.regionHistory.length - this.regionHistoryShift - 1]
		)
		this.regionHistoryChanging = false
	}

	public async historyForward() {
		if (this.regionHistoryShift <= 0) return

		this.regionHistoryShift--
		this.regionHistoryChanging = true
		await systemManager.setCurrentRegion(
			this.regionHistory[this.regionHistory.length - this.regionHistoryShift - 1]
		)
		this.regionHistoryChanging = false
	}
}

const historyService = Vue.observable(new HistoryService())

export default historyService
