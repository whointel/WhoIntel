import events from "@/service/EventBus"
import api from "@/lib/EVEApi"
import {ILogEntry, LOG_ENTRY_TYPE} from "@/types/ILogEntry"
import * as log from "electron-log"
import parseJSONDate from "date-fns/parseJSON"
import differenceInMinutes from "date-fns/differenceInMinutes"
import systemManager from "@/service/SystemManager"
import EVESystem from "@/lib/EVESystem"
import settingsService from "@/service/settings"
import store from "@/store"
import {ZKB_STATUS} from "@/types/ZKillboard"

import {QueueingSubject} from "queueing-subject"
import {firstValueFrom, Observable, Subscription} from "rxjs"
import {share, switchMap, map, tap} from "rxjs/operators"
import makeWebSocketObservable from "@/service/WS"
import {retryBackoff} from "backoff-rxjs"
import {API_KILLMAIL} from "@/types/API"

class ZKillboard {
	private messagesSubscription: Subscription | null = null
	private readonly input$: QueueingSubject<any>
	private messages$: Observable<string>

	constructor() {
		this.input$ = new QueueingSubject<any>()

		const socket$ = makeWebSocketObservable<string>("wss://zkillboard.com/websocket/")

		this.messages$ = socket$.pipe(
			map(
				(params) => {
					if (!params.socket.readyState) {
						throw {code: 0, reason: "WebSocket not in readyState"}
					}
					return params
				},
			),
			tap({
				error: (error) => log.error("zkillboard: error", error.code ? {
					code: error.code,
					reason: error.reason,
				} : {readyState: error.target?.readyState})
			}),
			retryBackoff({
				initialInterval: 500,
				maxInterval: 20000,
				resetOnSuccess: true,
			}),

			switchMap(({socket, getWebSocketResponses}) => {
				store.commit("setZKBStatus", ZKB_STATUS.CONNECTED)
				this.subscribe()

				return getWebSocketResponses(this.input$.pipe(
					map((request) => JSON.stringify(request)
					),
				)).pipe(
					map((response) => JSON.parse(response)),
				)
			}),

			share(),
		)
	}

	init() {
		this.connectZK()
	}

	connectZK() {
		if (!settingsService.$.zkbEnable) return
		if (
			!settingsService.$.favoriteZKBRegions
			|| !settingsService.$.favoriteZKBRegions.length
		) {
			log.warn("zkillboard: connect abort due no channels")
			return
		}

		if (this.messagesSubscription) return

		store.commit("setZKBStatus", ZKB_STATUS.CONNECTING)
		this.messagesSubscription = this.messages$.subscribe(
			this.processZK.bind(this),
			// () => {
			// },
			this.disconnectZK.bind(this)
		)
	}

	disconnectZK(event: any = null) {
		log.warn("zkillboard: closed", event)
		store.commit("setZKBStatus", ZKB_STATUS.DISCONNECTED)
		if (this.messagesSubscription) {
			this.messagesSubscription.unsubscribe()
			this.messagesSubscription = null
		}
	}

	reconnectZK(event: any = null) {
		zkillboard.disconnectZK(event)
		zkillboard.connectZK()
	}

	switchStatus(enable: boolean) {
		if (settingsService.$.zkbEnable === enable) return

		settingsService.$.zkbEnable = enable
		if (enable) {
			this.connectZK()
		} else {
			this.disconnectZK()
		}
	}

	async processZK(data: any) {
		log.warn("zkillboard: message", data)
		const zk_data = data
		let killmail: API_KILLMAIL
		try {
			({data: killmail} = await firstValueFrom(api.killmail$(zk_data.killID, zk_data.hash)))
			log.warn("zkillboard: killmail", killmail)
		} catch (e) {
			log.warn(e)
			return
		}

		const eve_date = parseJSONDate(killmail.killmail_time)

		const systems: EVESystem[] = []
		const system = systemManager.getSystemById(killmail.solar_system_id)
		if (system) {
			systems.push(system)
		}

		let isOld = false
		const expireMinutes = Number(settingsService.$.alarmExpireMinutes)
		if (
			expireMinutes
			&& expireMinutes > 0
		) {
			const dfm = differenceInMinutes(new Date(), eve_date)
			isOld = dfm > expireMinutes
		}
		// console.debug("ZKB:DFM:", dfm)

		const logEntry: ILogEntry = {
			ts: eve_date,
			sender: "ZKillboard",
			message: "",
			channel: "ZKillboard",
			systems: systems,
			hash: zk_data.killID + zk_data.hash,
			type: LOG_ENTRY_TYPE.ZKILLBOARD,
			character: null,
			zk: {
				npcOnly: ZKillboard.isNPC(killmail),
				attackersCnt: killmail.attackers.length,
				victimShipTypeId: killmail.victim?.ship_type_id,
				character_id: zk_data.character_id,
				url: zk_data.url,
				old: isOld,
			}
		}

		events.$emit("zkillboard:event", null, logEntry)
	}

	private subscribe() {
		settingsService.$.favoriteZKBRegions.forEach(region_id => {
			this.input$.next({"action": "sub", "channel": `region:${region_id}`})
		})
	}

	private static isNPC(killmail: API_KILLMAIL) {
		const victim = killmail.victim
		if (
			victim.character_id === undefined
			&& victim.corporation_id && (victim.corporation_id > 1 && victim.corporation_id < 1999999)
		) {
			return true
		}

		for (const attacker of killmail.attackers) {
			if (attacker.character_id && attacker.character_id > 3999999) return false
			if (attacker.corporation_id && attacker.corporation_id > 1999999) return false
		}

		return true
	}
}

const zkillboard = new ZKillboard()

export default zkillboard
