import api, {apiPoll} from "@/lib/EVEApi"
import store from "@/store"
import systemManager from "@/service/SystemManager"
import events from "@/service/EventBus"
import {Subscription} from "rxjs"

class EVEStats {
	status$ = new Subscription()
	kills$ = new Subscription()
	jumps$ = new Subscription()

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
		this.status$.unsubscribe()

		this.status$ = apiPoll(api.status$(), {name: "status"}).subscribe(
			(data) => {
				store.commit("setEVEStatus", data)
			},
		)
	}

	requestKills() {
		this.kills$.unsubscribe()

		this.kills$ = apiPoll(api.system_kills$(), {name: "system_kills"}).subscribe(
			(kills) => {
				if (!kills) return
				kills.forEach(record => systemManager.setSystemKills(record))
			},
		)
	}

	requestJumps() {
		this.jumps$.unsubscribe()

		this.jumps$ = apiPoll(api.system_jumps$(), {name: "system_jumps"}).subscribe(
			(jumps) => {
				if (!jumps) return
				jumps.forEach(record => systemManager.setSystemJumps(record))
			},
		)
	}
}

const eveStats = new EVEStats()

export default eveStats
