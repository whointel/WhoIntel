import differenceInSeconds from "date-fns/differenceInSeconds"
import systemManager from "@/service/SystemManager"
import {IREGION} from "@/types/MAP"
import settingsService from "@/service/settings"
import events from "@/service/EventBus"
import round from "lodash/round"

interface ALARM_COLORS_INTERFACE {
	seconds: number
	bgClass: string
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

const COLOR_WHITE = "rgb(255, 255, 255)"
const COLOR_BLACK = "rgb(0, 0, 0)"

const ALARM_COLORS_LIGHT: { [key in ALARM_COLORS_KEYS]: ALARM_COLORS_INTERFACE } = {
	[ALARM_COLORS_KEYS.S0]: {
		seconds: 60 * 4,
		bgClass: "alertS0",
		text: COLOR_WHITE,
	},
	[ALARM_COLORS_KEYS.S1]: {
		seconds: 60 * 10,
		bgClass: "alertS1",
		text: COLOR_WHITE,
	},
	[ALARM_COLORS_KEYS.S2]: {
		seconds: 60 * 15,
		bgClass: "alertS2",
		text: COLOR_BLACK,
	},
	[ALARM_COLORS_KEYS.S3]: {
		seconds: 60 * 25,
		bgClass: "alertS3",
		text: COLOR_BLACK,
	},
	[ALARM_COLORS_KEYS.S4]: {
		seconds: 60 * 60,
		bgClass: "alertS4",
		text: COLOR_BLACK,
	},
}

const ALARM_COLORS_DARK: { [key in ALARM_COLORS_KEYS]: ALARM_COLORS_INTERFACE } = {
	[ALARM_COLORS_KEYS.S0]: {
		seconds: 60 * 4,
		bgClass: "alertS0",
		text: COLOR_BLACK,
	},
	[ALARM_COLORS_KEYS.S1]: {
		seconds: 60 * 10,
		bgClass: "alertS1",
		text: COLOR_BLACK,
	},
	[ALARM_COLORS_KEYS.S2]: {
		seconds: 60 * 15,
		bgClass: "alertS2",
		text: COLOR_WHITE,
	},
	[ALARM_COLORS_KEYS.S3]: {
		seconds: 60 * 25,
		bgClass: "alertS3",
		text: COLOR_WHITE,
	},
	[ALARM_COLORS_KEYS.S4]: {
		seconds: 60 * 60,
		bgClass: "alertS4",
		text: COLOR_WHITE,
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
	security: number
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
	private systemNameLine: SVGTextElement | null = null
	private dataLine: SVGTextElement | null = null

	lastAlarmTime: Date | null = null
	mapCoordinates: MapCoordinates | null = null
	neighbours: EVESystem[] = []
	neighbourRegions: number[] = []

	constructor(name: string, id: number, region_id: number, security: number) {
		this.name = name
		this.id = id
		this.region_id = region_id
		this.security = security
	}

	get securityFormatted(): string {
		const security = round(this.security, 1)
		let result = String(security)
		if (security === 1) result = "1.0"
		if (security === 0) result = "0.0"
		if (security === -1) result = "-1.0"
		if (security >= 0) result = `&nbsp${result}`
		return result
	}

	get securityColor(): string {
		if (settingsService.$.darkTheme) {
			if (this.security >= 1.0) {
				return "#33FFFF"
			} else if (this.security >= 0.9) {
				return "#64FFFF"
			} else if (this.security >= 0.8) {
				return "#00F94B"
			} else if (this.security >= 0.7) {
				return "#00FF00"
			} else if (this.security >= 0.6) {
				return "#B2FF3B"
			} else if (this.security >= 0.5) {
				return "#FFFF00"
			} else if (this.security >= 0.4) {
				return "#FF9700"
			} else if (this.security >= 0.3) {
				return "#FF7E00"
			} else if (this.security >= 0.2) {
				return "#FF5500"
			} else if (this.security >= 0.1) {
				return "#F63300"
			} else {
				return "#FF0000"
			}
		}

		if (this.security >= 0.5) {
			return "#009900"
		} else if (this.security >= 0.1) {
			return "#FF8000"
		} else {
			return "#FF0000"
		}
	}

	hide() {
		this.isShow = false

		this.mapCoordinates = null
		this.svgContainer = null
		this.svgSymbol = null
		this.svgSRect = null
		this.dataLine = null
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
			system_color = system_kills * 255 / max
			this.setTextColor(COLOR_WHITE)
			this.setTextSystemColor(COLOR_WHITE)
			this.setRectColor(`rgb(${system_color},0,0)`)
		} else {
			const system_color = 255 - (system_kills * 255 / max)
			this.setTextColor(system_color > 127 ? COLOR_WHITE : COLOR_BLACK)
			this.setTextSystemColor(system_color > 127 ? COLOR_BLACK : COLOR_WHITE)
			this.setRectColor(`rgb(255,${system_color},${system_color})`)
		}

		this.setText(`${this.kills.ship} / ${this.kills.pod}`)
	}

	showKillsNpcOverlay(max: number) {
		this.isShow = false
		const system_kills = this.kills.npc

		this.checkSVGBindings()
		let system_color

		if (settingsService.$.darkTheme) {
			system_color = system_kills * 255 / max

			this.setTextColor(system_color > 170 ? COLOR_BLACK : COLOR_WHITE)
			this.setTextSystemColor(system_color > 170 ? COLOR_BLACK : COLOR_WHITE)
			this.setRectColor(`rgb(0,${system_color},0)`)
		} else {
			system_color = 255 - (system_kills * 255 / max)
			this.setTextColor(COLOR_BLACK)
			this.setTextSystemColor(COLOR_BLACK)
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

			this.setTextColor(system_color > 127 ? COLOR_WHITE : COLOR_WHITE)
			this.setTextSystemColor(system_color > 127 ? COLOR_WHITE : COLOR_WHITE)
			this.setRectColor(`rgb(0,0,${system_color})`)
		} else {
			system_color = 255 - (system_jumps * 255 / max)

			this.setTextColor(system_color > 127 ? COLOR_BLACK : COLOR_WHITE)
			this.setTextSystemColor(system_color > 127 ? COLOR_BLACK : COLOR_WHITE)
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
			const textNodes = this.svgSymbol.querySelectorAll("text")
			this.systemNameLine = textNodes[0]
			this.dataLine = textNodes[1]
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
		this.setRectColorClass(alarmStatus.bgClass)
		this.setTextColor(alarmStatus.text)
		this.setTextSystemColor(alarmStatus.text)
	}

	private setRectColorClass(color_class: string) {
		if (!this.svgSRect) return

		this.svgSRect.removeAttribute("class")
		this.svgSRect.removeAttribute("style")
		this.svgSRect.classList.add("s")
		this.svgSRect.classList.add(color_class)
	}

	private setRectColor(color: string) {
		if (!this.svgSRect) return

		this.svgSRect.removeAttribute("class")
		this.svgSRect.classList.add("s")
		this.svgSRect.style.fill = color
	}

	setText(text: string) {
		if (!this.dataLine) return

		this.dataLine.textContent = text
	}

	setTextSystemColor(color: string) {
		if (!this.systemNameLine) return

		this.systemNameLine.style.fill = color
	}

	setTextColor(color: string) {
		if (!this.dataLine) return

		this.dataLine.style.fill = color
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

				if (calcValue < 300) {
					this.setTextColor("#008100")
					this.setTextSystemColor("#008100")
					this.setRectColor(`rgba(${calcValue},255,${calcValue})`)
				}

				break
		}

		this.needRefresh = false
	}
}
