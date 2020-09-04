import events from "@/service/EventBus"
import {ILogEntry, LOG_ENTRY_TYPE} from "@/types/ILogEntry"
import EVESystem from "@/lib/EVESystem"
import settingsService from "@/service/settings"
import {PlayAlarm} from "@/service/PlayAlarm"
import systemManager from "@/service/SystemManager"
import {intersection} from "lodash"
import {ipcRenderer} from "electron"
import characterManager from "@/service/CharacterManager"
import Vue from "vue"
import * as log from "electron-log"
import differenceInHours from "date-fns/differenceInHours"

const LOCAL_CHANNEL_CHANGE_SYSTEM_SENDER_PREFIX = ["EVE System", "Система EVE"]
const LOCAL_CHANNEL_CHANGE_SYSTEM_PREFIX = ["Channel changed to Local : ", "Канал изменен на Локальный: "]

class LogReader {
	logs: ILogEntry[] = []
	logHashes: Set<string> = new Set<string>()

	public init() {
		events.$on("electron:logReader:entry", this.logHandler.bind(this))
		events.$on("zkillboard:event", this.logHandler.bind(this))
		setInterval(this.cleanOldEntries.bind(this), 32 * 60 * 1000)
	}

	private cleanOldEntries() {
		const currentDate = new Date()
		let cnt = 0

		let logCleanOldInHours = settingsService.$.logCleanOldInHours
		if (logCleanOldInHours <= 0) {
			logCleanOldInHours = 6
		}
		if (logCleanOldInHours > 100) {
			logCleanOldInHours = 48
		}

		log.debug("LogReader:start cleaning:old in hours:", logCleanOldInHours)
		for (let i = this.logs.length - 1; i >= 0; i--) {
			const logEntry = this.logs[i]
			if (differenceInHours(logEntry.ts, currentDate) < logCleanOldInHours) {
				// if we reach pretty new entry - stop scanning
				break
			}
			cnt++
			this.logHashes.delete(logEntry.hash)
			this.logs.splice(i, 1)
		}
		log.debug("LogReader:stop cleaning:del cnt:", cnt)
	}

	private logHandler(event, logEntry: ILogEntry) {
		log.info("LogReader:logHandler:", logEntry)

		if (this.logHashes.has(logEntry.hash)) {
			log.info("LogReader:logHandler:ignore due hash duplicate")
			return
		}
		this.logHashes.add(logEntry.hash)

		switch (logEntry.type) {
			case LOG_ENTRY_TYPE.LOCAL:
				this.localLogHandler(logEntry)
				break
			case LOG_ENTRY_TYPE.ZKILLBOARD:
				this.zkillboardLogHandler(logEntry)
				break
			case LOG_ENTRY_TYPE.SECURE:
				this.secureLogHandler(logEntry)
				break
			default:
				break
		}
	}

	private storeEntry(entry: ILogEntry) {
		Object.freeze(entry)
		this.logs.unshift(entry)
	}

	private localLogHandler(logEntry: ILogEntry) {
		if (!LOCAL_CHANNEL_CHANGE_SYSTEM_SENDER_PREFIX.includes(logEntry.sender)) return

		for (let i = 0; i < LOCAL_CHANNEL_CHANGE_SYSTEM_PREFIX.length; i++) {
			if (!logEntry.message.startsWith(LOCAL_CHANNEL_CHANGE_SYSTEM_PREFIX[i])) continue

			let systemName = logEntry.message
			systemName = systemName.slice(LOCAL_CHANNEL_CHANGE_SYSTEM_PREFIX[i].length)
			if (systemName.endsWith("*")) {
				systemName = systemName.substr(0, systemName.length - 1)
			}

			const system = systemManager.getSystemByName(systemName)
			if (system) {
				logEntry.systems = [system]
				if (logEntry.character) characterManager.setLocation(logEntry.character, system)
			}

			this.storeEntry(logEntry)
			break
		}
	}

	private secureLogHandler(logEntry: ILogEntry) {
		const words = logEntry.message.toUpperCase().split(" ")

		logEntry.secure = {
			question: false,
			clear: false,
			boost: false,
		}

		words.forEach((word, index) => {
			word = word.replace(/\*/g, '')

			const system = systemManager.getSystemByName(word)
			if (system) {
				logEntry.systems.push(system)
				words.splice(index, 1)
			}
		})

		if (
			words.includes("CLR?")
			|| words.includes("CLEAR?")
			|| words.includes("STATUS")
			|| words.includes("STATUS?")
			|| words.includes("STAT")
			|| words.includes("STAT?")
			|| words.includes("СТАТУС?")
			|| words.includes("СТАТУС")
		) {
			logEntry.secure.question = true
		}

		if (words.includes("BOOST")) {
			logEntry.secure.boost = true
		}

		if (
			(
				words.includes("CLR")
				|| words.includes("CLEAR")
				|| words.includes("СДК")
			)
			&& !logEntry.message.endsWith("?")
		) {
			logEntry.secure.clear = true
		}

		this.storeEntry(logEntry)

		if (logEntry.secure.clear) {
			logEntry.systems.forEach((system: EVESystem) => system.clearStatus())
			if (settingsService.$.alarmPopup && settingsService.$.alarmPopupALL) {
				this.alert(logEntry, false, logEntry.systems)
			}
			return
		}

		if (logEntry.secure.question) {
			if (settingsService.$.alarmPopup && settingsService.$.alarmPopupALL) {
				this.alert(logEntry, false, logEntry.systems)
			}
			return
		}

		this.alert(logEntry, true, logEntry.systems.filter((system: EVESystem) => system.setAlarm(logEntry.ts)))
	}

	private zkillboardLogHandler(logEntry: ILogEntry) {
		this.storeEntry(logEntry)

		if (
			logEntry.zk!.npcOnly
			|| logEntry.zk!.old
		) {
			return
		}

		this.alert(logEntry, true, logEntry.systems)
	}

	private getNeighbourSystemDistance(alarmSystems: EVESystem[]): string[] {
		const currentSystem = characterManager.getCurrentSystem()

		if (!currentSystem || !alarmSystems.length) return []

		const systemDistance: string[] = []

		const neighbours = currentSystem.getNeighbours(settingsService.$.alarmDistance)
		const alertSystemIds = alarmSystems.map((system: EVESystem) => system.id)
		const intersectionSystemIds = intersection(alertSystemIds, Object.keys(neighbours).map(Number))
		intersectionSystemIds.forEach(id => {
			const system = systemManager.getSystemById(id)
			if (!system) return
			systemDistance.push(`${system.name} / ${neighbours[system.id].distance}`)
		})

		return systemDistance
	}

	private alert(logEntry: ILogEntry, isAlertLogEntry: boolean, alarmSystems: EVESystem[]) {
		if (
			!settingsService.$.alarmPopup
			&& !settingsService.$.alarmSound
		) return

		const systemDistance = this.getNeighbourSystemDistance(alarmSystems)
		log.info("LogReader:alert:systemDistance:", systemDistance)

		if (systemDistance.length && settingsService.$.alarmSound) {
			PlayAlarm()
		}

		if (
			settingsService.$.alarmPopup
			&& (
				settingsService.$.alarmPopupALL
				|| systemDistance.length
			)
		) {
			this.showNotification(
				systemDistance.join("\n"),
				logEntry,
				isAlertLogEntry && (systemDistance.length > 0)
			)
		}
	}

	public showNotification(
		systems: string,
		logEntry: ILogEntry,
		isAlertLogEntry: boolean
	) {
		if (systems.length > 0) {
			systems += "\n\n"
		}

		let message = logEntry.message
		if (message.length === 0) {
			message = `ZKB Kill in ${logEntry.systems[0].name}`
		}
		const notification = new Notification(isAlertLogEntry ? "Alert" : "Feed", {
			body: systems + message,
			...(settingsService.platform === "win32" ? {icon: "/icon.png"} : {}),
		})

		notification.onclick = () => {
			ipcRenderer.send("window::restore")
			notification.close()
			if (logEntry.systems.length) {
				systemManager.markSystem(logEntry.systems[0])
			}
		}
	}
}

const logReader = Vue.observable(new LogReader())

export default logReader
