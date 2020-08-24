import events from "@/service/EventBus"
import {ILogEntry, LOG_ENTRY_TYPE} from "@/types/ILogEntry"
import EVESystem from "@/lib/EVESystem"
import settingsService from "@/service/settings"
import {PlayAlarm} from "@/service/PlayAlarm"
import systemManager from "@/service/SystemManager"
import {intersection} from "lodash"
import store from "@/store"
import {ipcRenderer} from "electron"
import characterManager from "@/service/CharacterManager"

const LOCAL_CHANNEL_CHANGE_SYSTEM_SENDER_PREFIX = ["EVE System", "Система EVE"]
const LOCAL_CHANNEL_CHANGE_SYSTEM_PREFIX = ["Channel changed to Local : ", "Канал изменен на Локальный: "]

class LogReader {
	logHashes: Set<string> = new Set<string>()

	// logs: ILogEntry[] = []

	constructor() {
		events.$on("electron:logReader:entry", this.logHandler.bind(this))
		events.$on("zkillboard:event", this.logHandler.bind(this))
	}

	init() {
		2 + 2;
		// dummy init for force construct in main
	}

	public get logs(): ILogEntry[] {
		return store.getters.logs
	}

	logHandler(event, logEntry: ILogEntry) {
		if (this.logHashes.has(logEntry.hash)) {
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

	add(entry: ILogEntry) {
		store.commit("addLog", Object.freeze(entry))
	}

	localLogHandler(logEntry: ILogEntry) {
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

			this.add(logEntry)
			break
		}
	}

	secureLogHandler(logEntry: ILogEntry) {
		let words = new Set(logEntry.message.split(" "))

		logEntry.secure = {
			question: false,
			clear: false,
			boost: false,
		}

		words.forEach(word => {
			word = word.replace(/\*/g, '')

			const system = systemManager.getSystemByName(word)
			if (system) {
				logEntry.systems.push(system)
				words.delete(word)
			}
		})

		// UPPER case
		words = new Set(logEntry.message.toUpperCase().split(" "))

		if (
			words.has("CLR?")
			|| words.has("CLEAR?")
			|| words.has("STATUS")
			|| words.has("STATUS?")
			|| words.has("STAT")
			|| words.has("STAT?")
			|| words.has("СТАТУС?")
			|| words.has("СТАТУС")
		) {
			logEntry.secure.question = true
		}

		if (words.has("BOOST")) {
			logEntry.secure.boost = true
		}

		if (
			(
				words.has("CLR")
				|| words.has("CLEAR")
				|| words.has("СДК")
			)
			&& !logEntry.message.endsWith("?")
		) {
			logEntry.secure.clear = true
		}

		this.add(logEntry)

		if (logEntry.secure.clear) {
			logEntry.systems.forEach((system: EVESystem) => system.clearStatus())
			return
		}

		if (logEntry.secure.question) {
			return
		}

		this.alert(logEntry)
	}

	zkillboardLogHandler(logEntry: ILogEntry) {
		this.add(logEntry)

		if (
			logEntry.zk!.npcOnly
			|| logEntry.zk!.old
		) {
			return
		}

		this.alert(logEntry)
	}

	private alert(logEntry: ILogEntry) {
		const alarmSystems = logEntry.systems.filter((system: EVESystem) => system.setAlarm(logEntry.ts))

		const currentSystem = characterManager.getCurrentSystem()
		if (
			currentSystem
			&& alarmSystems.length
			&& (settingsService.$.alarmPopup || settingsService.$.alarmSound)
		) {
			const neighbours = currentSystem.getNeighbours(settingsService.$.alarmDistance)
			const alertSystemIds = alarmSystems.map((system: EVESystem) => system.id)
			const intersectionSystemIds = intersection(alertSystemIds, Object.keys(neighbours).map(Number))
			const systemDistance: string[] = []
			intersectionSystemIds.forEach(id => {
				const system = systemManager.getSystemById(id)
				if (!system) return
				systemDistance.push(`${system.name} / ${neighbours[system.id].distance}`)
			})

			if (systemDistance.length) {
				if (settingsService.$.alarmSound) {
					PlayAlarm()
				}
				if (settingsService.$.alarmPopup) {
					this.showNotification(
						systemDistance.join("\n"),
						logEntry
					)
				}
			}
		}
	}

	private showNotification(
		systems: string,
		logEntry: ILogEntry
	) {
		const notification = new Notification('Alert', {
			body: systems + "\n\n" + logEntry.message,
			icon: "/icon.png",
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

const logReader = new LogReader()

export default logReader
