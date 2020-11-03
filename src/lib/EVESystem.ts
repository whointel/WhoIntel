import differenceInSeconds from "date-fns/differenceInSeconds"
import systemManager from "@/service/SystemManager"
import settingsService from "@/service/settings"
import round from "lodash/round"
import EVERegion from "@/lib/EVERegion";

interface ALARM_COLORS {
	seconds: number
	class: string
}

export interface GET_NEIGHBOURS {
	[key: number]: {
		distance: number
		system: EVESystem
	}
}

enum ALARM_KEYS {
	IDLE,
	S1,
	S2,
	S3,
	S4,
	CLEAR1,
	CLEAR2,
	CLEAR_IDLE,
}

export enum EVESystemStatus {
	IDLE,
	CLEAR,
	ALARM,
}

const COLOR_WHITE = "rgb(255, 255, 255)"
const COLOR_BLACK = "rgb(0, 0, 0)"

const STATUS_CFG: { [key in ALARM_KEYS]: ALARM_COLORS } = {
	[ALARM_KEYS.IDLE]: {
		seconds: 0,
		class: "alertIDLE",
	},
	[ALARM_KEYS.S1]: {
		seconds: 60 * 4,
		class: "alertS1",
	},
	[ALARM_KEYS.S2]: {
		seconds: 60 * 10,
		class: "alertS2",
	},
	[ALARM_KEYS.S3]: {
		seconds: 60 * 15,
		class: "alertS3",
	},
	[ALARM_KEYS.S4]: {
		seconds: 60 * 25,
		class: "alertS4",
	},
	[ALARM_KEYS.CLEAR1]: {
		seconds: 60 * 5,
		class: "alertClear1",
	},
	[ALARM_KEYS.CLEAR2]: {
		seconds: 60 * 10,
		class: "alertClear2",
	},
	[ALARM_KEYS.CLEAR_IDLE]: {
		seconds: 60 * 15,
		class: "alertClear2",
	},
}

export interface MapCoordinates {
	x: number
	y: number
	width: number
	height: number
	center_x: number
	center_y: number
}

export default class EVESystem {
	public status: EVESystemStatus = EVESystemStatus.IDLE
	#alarmStatus: ALARM_KEYS = ALARM_KEYS.IDLE
	public id: number
	public name: string
	public region_id: number
	public security: number
	public isShow = false
	public needRefresh = false

	public kills = {
		npc: 0,
		pod: 0,
		ship: 0,
	}

	public jumps = 0

	public svgContainer: SVGElement | null = null
	#svgSymbol: SVGSymbolElement | undefined | null = null
	#svgSRect: SVGRectElement | null = null
	#systemNameLine: SVGTextElement | null = null
	#dataLine: SVGTextElement | null = null

	public lastAlarmTime: Date | null = null
	public mapCoordinates: MapCoordinates | null = null
	public neighbours: EVESystem[] = []
	public neighbourRegions: number[] = []

	constructor(name: string, id: number, region_id: number, security: number) {
		this.name = name
		this.id = id
		this.region_id = region_id
		this.security = security
	}

	get nameDebug(): string {
		return `EVESystem [${this.name} #${this.id}]`
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

	public hide() {
		this.isShow = false

		// this.mapCoordinates = null
		this.svgContainer = null
		this.#svgSymbol = null
		this.#svgSRect = null
		this.#dataLine = null
	}

	public show() {
		this.isShow = true
		this.needRefresh = true
		this.checkSVGBindings()
		if (this.status === EVESystemStatus.IDLE) {
			this.idle()
		}
	}

	private idle() {
		this.status = EVESystemStatus.IDLE
		this.setAlarmColor(STATUS_CFG[ALARM_KEYS.IDLE])
		this.setText("?")
	}

	public showKillsOverlay(max: number) {
		this.isShow = false
		const system_kills = this.kills.ship + this.kills.pod

		this.checkSVGBindings()
		let system_color

		if (settingsService.$.darkTheme) {
			system_color = system_kills * 255 / max
			this.setTextColor(COLOR_WHITE)
			this.setRectColor(`rgb(${system_color},0,0)`)
		} else {
			system_color = 255 - (system_kills * 255 / max)
			this.setTextColor(system_color > 127 ? COLOR_WHITE : COLOR_BLACK)
			this.setRectColor(`rgb(255,${system_color},${system_color})`)
		}

		this.setText(`${this.kills.ship} / ${this.kills.pod}`)
	}

	public showKillsNpcOverlay(max: number) {
		this.isShow = false
		const system_kills = this.kills.npc

		this.checkSVGBindings()
		let system_color

		if (settingsService.$.darkTheme) {
			system_color = system_kills * 255 / max

			this.setTextColor(system_color > 170 ? COLOR_BLACK : COLOR_WHITE)
			this.setRectColor(`rgb(0,${system_color},0)`)
		} else {
			system_color = 255 - (system_kills * 255 / max)

			this.setTextColor(COLOR_BLACK)
			this.setRectColor(`rgb(${system_color},255,${system_color})`)
		}

		this.setText(String(system_kills))
	}

	public showJumpsOverlay(max: number) {
		this.isShow = false
		const system_jumps = this.jumps

		this.checkSVGBindings()
		let system_color

		if (settingsService.$.darkTheme) {
			system_color = system_jumps * 255 / max

			this.setTextColor(system_color > 127 ? COLOR_WHITE : COLOR_WHITE)
			this.setRectColor(`rgb(0,0,${system_color})`)
		} else {
			system_color = 255 - (system_jumps * 255 / max)

			this.setTextColor(system_color > 127 ? COLOR_BLACK : COLOR_WHITE)
			this.setRectColor(`rgb(${system_color},${system_color},255)`)
		}

		this.setText(String(system_jumps))
	}

	public setMap(mapCoordinates: MapCoordinates, svgContainer: SVGElement) {
		this.mapCoordinates = mapCoordinates
		this.svgContainer = svgContainer
	}

	private checkSVGBindings() {
		this.#svgSymbol = this.svgContainer?.querySelector(`#def${this.id}`)
		if (this.#svgSymbol) {
			this.#svgSRect = this.#svgSymbol.querySelector(`rect#rect${this.id}`)
			const textNodes = this.#svgSymbol.querySelectorAll("text")
			this.#systemNameLine = textNodes[0]
			this.#dataLine = textNodes[1]
		}
	}

	public addNeighbour(system: EVESystem) {
		if (this.neighbours.includes(system)) return

		this.neighbours.push(system)

		if (this.region_id !== system.region_id) {
			this.addNeighbourRegion(system.region_id)
		}
	}

	get region(): EVERegion {
		return systemManager.regions[this.region_id] as EVERegion
	}

	public addNeighbourRegion(region_id: number) {
		if (this.neighbourRegions.includes(region_id)) return

		this.neighbourRegions.push(region_id)
	}

	public getNeighbours(distance = 1): GET_NEIGHBOURS {
		const systems: GET_NEIGHBOURS = {
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
				obj.system.neighbours.forEach((neighbour) => {
					if (!systems[neighbour.id]) {
						newSystems.push(neighbour)
					}
				})
			}
			newSystems.forEach((system) => systems[system.id] = {
				distance: currentDistance,
				system,
			})
		}

		return systems
	}

	private subscribeSystemLoop() {
		systemManager.subscribeSystemLoop(this)
	}

	private unSubscribeSystemLoop() {
		systemManager.unSubscribeSystemLoop(this)
	}

	public setAlarm(date: Date = new Date()): boolean {
		if (
			this.lastAlarmTime
			&& this.lastAlarmTime > date
		) {
			return false
		}

		this.status = EVESystemStatus.ALARM
		this.lastAlarmTime = date
		this.#alarmStatus = ALARM_KEYS.S1
		this.needRefresh = true
		this.update()
		this.subscribeSystemLoop()

		return true
	}

	public clearStatus() {
		this.status = EVESystemStatus.CLEAR
		this.#alarmStatus = ALARM_KEYS.CLEAR1
		this.lastAlarmTime = new Date()
		this.needRefresh = true
		this.update()
		this.subscribeSystemLoop()
	}

	private setAlarmColor(alarmStatus: ALARM_COLORS) {
		if (!this.#svgSymbol) return

		this.#svgSymbol.removeAttribute("class")
		this.#svgSymbol.classList.add(alarmStatus.class)

		this.setRectColor()
		this.setTextColor()
	}

	private setRectColor(color?: string) {
		if (!this.#svgSRect) return

		if (color) {
			this.#svgSRect.style.fill = color
		} else {
			this.#svgSRect.removeAttribute("style")
		}
	}

	public setText(text: string) {
		if (!this.#dataLine) return

		this.#dataLine.textContent = text
	}

	public setTextColor(color?: string) {
		if (this.#dataLine) {
			if (color) {
				this.#dataLine.style.fill = color
			} else {
				this.#dataLine.removeAttribute("style")
			}
		}

		if (this.#systemNameLine) {
			if (color) {
				this.#systemNameLine.style.fill = color
			} else {
				this.#systemNameLine.removeAttribute("style")
			}
		}
	}

	private static formatTime(seconds: number): string {
		const min = Math.floor(seconds / 60).toString().padStart(2, "0")
		const sec = (seconds % 60).toString().padStart(2, "0")
		return `${min}:${sec}`
	}

	public update() {
		if (!this.isShow) return

		if (!this.lastAlarmTime) return
		let secondsFromAlarm = 0
		const alarmColors = STATUS_CFG[this.#alarmStatus]

		switch (this.status) {
			case EVESystemStatus.ALARM:
				secondsFromAlarm = differenceInSeconds(new Date(), this.lastAlarmTime)
				this.setText(EVESystem.formatTime(secondsFromAlarm))

				switch (this.#alarmStatus) {
					case ALARM_KEYS.S1:
						if (this.needRefresh) {
							this.setAlarmColor(STATUS_CFG[this.#alarmStatus])
						}
						if (secondsFromAlarm > alarmColors.seconds) {
							this.#alarmStatus = ALARM_KEYS.S2
							this.setAlarmColor(STATUS_CFG[this.#alarmStatus])
						}
						break
					case ALARM_KEYS.S2:
						if (this.needRefresh) {
							this.setAlarmColor(STATUS_CFG[this.#alarmStatus])
						}
						if (secondsFromAlarm > alarmColors.seconds) {
							this.#alarmStatus = ALARM_KEYS.S3
							this.setAlarmColor(STATUS_CFG[this.#alarmStatus])
						}
						break
					case ALARM_KEYS.S3:
						if (this.needRefresh) {
							this.setAlarmColor(STATUS_CFG[this.#alarmStatus])
						}
						if (secondsFromAlarm > alarmColors.seconds) {
							this.#alarmStatus = ALARM_KEYS.S4
							this.setAlarmColor(STATUS_CFG[this.#alarmStatus])
						}
						break
					case ALARM_KEYS.S4:
						if (this.needRefresh) {
							this.setAlarmColor(STATUS_CFG[this.#alarmStatus])
						}
						if (secondsFromAlarm > alarmColors.seconds) {
							this.idle()
							this.unSubscribeSystemLoop()
						}
						break
				}
				break
			case EVESystemStatus.CLEAR:
				secondsFromAlarm = differenceInSeconds(new Date(), this.lastAlarmTime)
				this.setText("clr: " + EVESystem.formatTime(secondsFromAlarm))

				switch (this.#alarmStatus) {
					case ALARM_KEYS.CLEAR1:
						if (this.needRefresh) {
							this.setAlarmColor(STATUS_CFG[this.#alarmStatus])
						}
						if (secondsFromAlarm > alarmColors.seconds) {
							this.#alarmStatus = ALARM_KEYS.CLEAR2
							this.setAlarmColor(STATUS_CFG[this.#alarmStatus])
						}
						break
					case ALARM_KEYS.CLEAR2:
						if (this.needRefresh) {
							this.setAlarmColor(STATUS_CFG[this.#alarmStatus])
						}
						if (secondsFromAlarm > alarmColors.seconds) {
							this.#alarmStatus = ALARM_KEYS.IDLE
							this.setAlarmColor(STATUS_CFG[this.#alarmStatus])
						}
						break
					case ALARM_KEYS.IDLE:
						if (this.needRefresh) {
							this.setAlarmColor(STATUS_CFG[this.#alarmStatus])
						}
						if (secondsFromAlarm > alarmColors.seconds) {
							this.idle()
							this.unSubscribeSystemLoop()
						}
						break
				}

				break
		}

		this.needRefresh = false
	}
}
