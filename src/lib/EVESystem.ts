import differenceInSeconds from "date-fns/differenceInSeconds"
import systemManager from "@/service/SystemManager"
import {IREGION} from "@/types/MAP"
import settingsService from "@/service/settings"
import events from "@/service/EventBus"

interface ALARM_COLORS_INTERFACE {
	seconds: number
	bg: string
	text: string
}

export interface IGET_NEIGHBOURS {
	[key: number]: {
		distance: number
		system: EVESystem
	}
}

enum ALARM_COLORS_KEYS {
	S0,
	S1,
	S2,
	S3,
	S4,
}

export enum EVESystemStatus {
	UNKNOWN,
	CLEAR,
	ALARM,
}

const ALARM_COLORS_LIGHT: { [key in ALARM_COLORS_KEYS]: ALARM_COLORS_INTERFACE } = {
	[ALARM_COLORS_KEYS.S0]: {
		seconds: 60 * 4,
		bg: "#FF0000",
		text: "#FFFFFF",
	},
	[ALARM_COLORS_KEYS.S1]: {
		seconds: 60 * 10,
		bg: "#FF9B0F",
		text: "#FFFFFF",
	},
	[ALARM_COLORS_KEYS.S2]: {
		seconds: 60 * 15,
		bg: "#FFFA0F",
		text: "#000000",
	},
	[ALARM_COLORS_KEYS.S3]: {
		seconds: 60 * 25,
		bg: "#FFFDA2",
		text: "#000000",
	},
	[ALARM_COLORS_KEYS.S4]: {
		seconds: 60 * 60,
		bg: "#FFFFFF",
		text: "#000000",
	},
}

const ALARM_COLORS_DARK: { [key in ALARM_COLORS_KEYS]: ALARM_COLORS_INTERFACE } = {
	[ALARM_COLORS_KEYS.S0]: {
		seconds: 60 * 4,
		bg: "#FF0000",
		text: "#000000",
	},
	[ALARM_COLORS_KEYS.S1]: {
		seconds: 60 * 10,
		bg: "#FF9B0F",
		text: "#000000",
	},
	[ALARM_COLORS_KEYS.S2]: {
		seconds: 60 * 15,
		bg: "#FFFA0F",
		text: "#FFFFFF",
	},
	[ALARM_COLORS_KEYS.S3]: {
		seconds: 60 * 25,
		bg: "#FFFDA2",
		text: "#FFFFFF",
	},
	[ALARM_COLORS_KEYS.S4]: {
		seconds: 60 * 60,
		bg: "#000000",
		text: "#FFFFFF",
	},
}

let ALARM_COLORS = settingsService.$.darkTheme ? ALARM_COLORS_DARK : ALARM_COLORS_LIGHT

events.$on("setDarkTheme", darkTheme => ALARM_COLORS = darkTheme ? ALARM_COLORS_DARK : ALARM_COLORS_LIGHT)

export interface MapCoordinates {
	x: number
	y: number
	width: number
	height: number
	center_x: number
	center_y: number
}

export default class EVESystem {
	status: EVESystemStatus = EVESystemStatus.UNKNOWN
	private alarmStatus: ALARM_COLORS_KEYS = ALARM_COLORS_KEYS.S0
	id: number
	name: string
	region_id: number
	isShow = false
	needRefresh = false

	kills = {
		npc: 0,
		pod: 0,
		ship: 0,
	}

	jumps = 0

	svgContainer: HTMLElement | null = null
	private svgSymbol: SVGSymbolElement | undefined | null = null
	private svgSRect: SVGRectElement | null = null
	private secondLine: SVGTextElement | null = null

	lastAlarmTime: Date | null = null
	mapCoordinates: MapCoordinates | null = null
	neighbours: EVESystem[] = []
	neighbourRegions: number[] = []

	constructor(name, id, region_id) {
		this.name = name
		this.id = id
		this.region_id = region_id
	}

	hide() {
		this.isShow = false

		this.mapCoordinates = null
		this.svgContainer = null
		this.svgSymbol = null
		this.svgSRect = null
		this.secondLine = null
	}

	show() {
		this.isShow = true
		this.needRefresh = true
		this.checkSVGBindings()
		this.setAlarmColor(ALARM_COLORS[ALARM_COLORS_KEYS.S4])
		this.setText("?")
	}

	showKillsOverlay(max: number) {
		this.isShow = false
		const system_kills = this.kills.ship + this.kills.pod

		this.checkSVGBindings()
		let system_color

		if (settingsService.$.darkTheme) {
			this.setTextColor("#FFFFFF")
			system_color = system_kills * 255 / max
			this.setRectColor(`rgb(${system_color},0,0)`)
		} else {
			const system_color = 255 - (system_kills * 255 / max)
			this.setTextColor(system_color > 127 ? "#FFFFFF" : "#000000")
			this.setRectColor(`rgb(${system_color},255,255)`)
		}

		this.setText(`${this.kills.ship} / ${this.kills.pod}`)
	}

	showKillsNpcOverlay(max: number) {
		this.isShow = false
		const system_kills = this.kills.npc

		this.checkSVGBindings()
		let system_color

		if (settingsService.$.darkTheme) {
			this.setTextColor("#FFFFFF")
			system_color = system_kills * 255 / max
			this.setRectColor(`rgb(0,${system_color},0)`)
		} else {
			this.setTextColor("#000000")
			system_color = 255 - (system_kills * 255 / max)
			this.setRectColor(`rgb(${system_color},255,${system_color})`)
		}

		this.setText(String(system_kills))
	}

	showJumpsOverlay(max: number) {
		this.isShow = false
		const system_jumps = this.jumps

		this.checkSVGBindings()
		let system_color

		if (settingsService.$.darkTheme) {
			system_color = system_jumps * 255 / max

			this.setTextColor(system_color > 127 ? "#FFFFFF" : "#000000")
			this.setRectColor(`rgb(0,0,${system_color})`)
		} else {
			system_color = 255 - (system_jumps * 255 / max)

			this.setTextColor(system_color > 127 ? "#000000" : "#FFFFFF")
			this.setRectColor(`rgb(${system_color},${system_color},255)`)
		}

		this.setText(String(system_jumps))
	}

	setMap(mapCoordinates: MapCoordinates, svgContainer: HTMLElement) {
		this.mapCoordinates = mapCoordinates
		this.svgContainer = svgContainer
	}

	private checkSVGBindings() {
		this.svgSymbol = this.svgContainer?.querySelector(`#def${this.id}`)
		if (this.svgSymbol) {
			this.svgSRect = this.svgSymbol.querySelector(`rect#rect${this.id}`)
			this.secondLine = this.svgSymbol.querySelectorAll("text")[1]
		}
	}

	addNeighbour(system: EVESystem) {
		if (this.neighbours.includes(system)) return

		this.neighbours.push(system)

		if (this.region_id !== system.region_id) {
			this.addNeighbourRegion(system.region_id)
		}
	}

	get region(): IREGION {
		return systemManager.regions[this.region_id]
	}

	addNeighbourRegion(region_id: number) {
		if (this.neighbourRegions.includes(region_id)) return

		this.neighbourRegions.push(region_id)
	}

	getNeighbours(distance = 1): IGET_NEIGHBOURS {
		const systems: IGET_NEIGHBOURS = {
			[this.id]: {
				distance: 0,
				system: this,
			}
		}

		let currentDistance = 0
		while (currentDistance < distance) {
			currentDistance += 1
			const newSystems: EVESystem[] = []
			for (const [, obj] of Object.entries(systems)) {
				obj.system.neighbours.forEach(neighbour => {
					if (!systems[neighbour.id]) {
						newSystems.push(neighbour)
					}
				})
			}
			newSystems.forEach(system => systems[system.id] = {
				distance: currentDistance,
				system: system,
			})
		}

		return systems
	}

	subscribeSystemLoop() {
		systemManager.subscribeSystemLoop(this)
	}

	// unSubscribeSystemLoop() {
	// 	systemManager.unSubscribeSystemLoop(this)
	// }

	setAlarm(date: Date = new Date()): boolean {
		if (
			this.lastAlarmTime
			&& this.lastAlarmTime > date
		) {
			return false
		}

		this.status = EVESystemStatus.ALARM
		this.lastAlarmTime = date
		this.alarmStatus = ALARM_COLORS_KEYS.S0
		this.needRefresh = true
		this.update()
		this.subscribeSystemLoop()

		return true
	}

	clearStatus() {
		this.status = EVESystemStatus.CLEAR
		this.lastAlarmTime = new Date()
		this.needRefresh = true
		this.update()
		this.subscribeSystemLoop()
	}

	private setAlarmColor(alarmStatus: ALARM_COLORS_INTERFACE) {
		this.setRectColor(alarmStatus.bg)
		this.setTextColor(alarmStatus.text)
	}

	private setRectColor(color: string) {
		if (!this.svgSRect) return

		this.svgSRect.style.fill = color
	}

	setText(text: string) {
		if (!this.secondLine) return

		this.secondLine.textContent = text
	}

	setTextColor(color: string) {
		if (!this.secondLine) return

		this.secondLine.style.fill = color
	}

	private static formatTime(seconds: number): string {
		const min = Math.floor(seconds / 60).toString().padStart(2, "0")
		const sec = (seconds % 60).toString().padStart(2, "0")
		return `${min}:${sec}`
	}

	update() {
		if (!this.isShow) return

		if (!this.lastAlarmTime) return
		let secondsFromAlarm = 0
		const alarmColors = ALARM_COLORS[this.alarmStatus]

		switch (this.status) {
			case EVESystemStatus.ALARM:
				secondsFromAlarm = differenceInSeconds(new Date(), this.lastAlarmTime)
				this.setText(EVESystem.formatTime(secondsFromAlarm))
				// this.setAlarmColor(ALARM_COLORS[this.alarmStatus])

				switch (this.alarmStatus) {
					case ALARM_COLORS_KEYS.S0:
						if (this.needRefresh) {
							this.setAlarmColor(ALARM_COLORS[this.alarmStatus])
						}
						if (secondsFromAlarm > alarmColors.seconds) {
							this.alarmStatus = ALARM_COLORS_KEYS.S1
							this.setAlarmColor(ALARM_COLORS[this.alarmStatus])
						}
						break
					case ALARM_COLORS_KEYS.S1:
						if (this.needRefresh) {
							this.setAlarmColor(ALARM_COLORS[this.alarmStatus])
						}
						if (secondsFromAlarm > alarmColors.seconds) {
							this.alarmStatus = ALARM_COLORS_KEYS.S2
							this.setAlarmColor(ALARM_COLORS[this.alarmStatus])
						}
						break
					case ALARM_COLORS_KEYS.S2:
						if (this.needRefresh) {
							this.setAlarmColor(ALARM_COLORS[this.alarmStatus])
						}
						if (secondsFromAlarm > alarmColors.seconds) {
							this.alarmStatus = ALARM_COLORS_KEYS.S3
							this.setAlarmColor(ALARM_COLORS[this.alarmStatus])
						}
						break
					case ALARM_COLORS_KEYS.S3:
						if (this.needRefresh) {
							this.setAlarmColor(ALARM_COLORS[this.alarmStatus])
						}
						if (secondsFromAlarm > alarmColors.seconds) {
							this.alarmStatus = ALARM_COLORS_KEYS.S4
							this.setAlarmColor(ALARM_COLORS[this.alarmStatus])
						}
						break
					case ALARM_COLORS_KEYS.S4:
						if (this.needRefresh) {
							this.setAlarmColor(ALARM_COLORS[this.alarmStatus])
						}
						break
				}
				break
			case EVESystemStatus.CLEAR:
				secondsFromAlarm = differenceInSeconds(new Date(), this.lastAlarmTime)
				this.setText("clr: " + EVESystem.formatTime(secondsFromAlarm))

				// eslint-disable-next-line no-case-declarations
				const secondsUntilWhite = 10 * 60
				// eslint-disable-next-line no-case-declarations
				let calcValue = Number(secondsFromAlarm / (secondsUntilWhite / 255))
				if (calcValue > 255) calcValue = 255

				this.setTextColor("#008100")
				this.setRectColor(`rgba(${calcValue},255,${calcValue},0.7)`)

				break
		}

		this.needRefresh = false
	}
}
