import api from "@/lib/EVEApi"
import store from "@/store"
import systemManager from "@/service/SystemManager"
import events from "@/service/EventBus"

class EVEStats {
	constructor() {
		events.$on("systemManager:ready", async () => {
			await this.requestKills()
			this.requestJumps()
		})
	}

	init() {
		this.requestStatus()
	}

	requestStatus() {
		const status$ = api.status$()
		status$.subscribe(
			(data) => {
				store.commit("setEVEStatus", data)
			},
		)
	}

	requestKills() {
		const kills$ = api.system_kills$()
		kills$.subscribe(
			(kills) => {
				if (!kills) return
				kills.forEach(record => systemManager.setSystemKills(record))
			},
		)
	}

	requestJumps() {
		const jumps$ = api.system_jumps$()
		jumps$.subscribe(
			(jumps) => {
				if (!jumps) return
				jumps.forEach(record => systemManager.setSystemJumps(record))
			},
		)
	}
}

const eveStats = new EVEStats()

export default eveStats
