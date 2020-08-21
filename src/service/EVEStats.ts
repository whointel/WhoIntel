import api, {apiPoll} from "@/lib/EVEApi"
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
		const status$ = apiPoll(api.status$(), {name: "status"})
		status$.subscribe(
			(data) => {
				store.commit("setEVEStatus", data)
			},
		)
	}

	requestKills() {
		const kills$ = apiPoll(api.system_kills$(), {name: "system_kills"})
		kills$.subscribe(
			(kills) => {
				if (!kills) return
				kills.forEach(record => systemManager.setSystemKills(record))
			},
		)
	}

	requestJumps() {
		const jumps$ = apiPoll(api.system_jumps$(), {name: "system_jumps"})
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
