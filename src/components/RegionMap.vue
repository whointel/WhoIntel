<template>
	<v-col
		:cols="cols"
		ref="contentContainer"
		class="content-container"
	>
		<div
			ref="svgContainer"
			class="svg-container"
			@wheel="onScroll"
			@mousedown="mousedown"
			@dragscrollend="mouseup"
			@mouseup="mouseup"
			v-html="svgContent"
			v-dragscroll.noback.noforward="true"
		/>
		<region-map-context-menu
			v-model="contextMenuOptions.show"
			:options="contextMenuOptions"
			@close="contextMenuOptions.show = false"
		/>
	</v-col>

</template>

<script lang="ts">
import {Component, Prop, Vue, Watch} from "vue-property-decorator"
import events from "@/service/EventBus"
import cheerio from "cheerio"
import systemManager from "@/service/SystemManager"
import {dragscroll} from "vue-dragscroll"
import RegionMapContextMenu from "@/components/RegionMapContextMenu.vue"
// eslint-disable-next-line no-unused-vars
import {I_CONTEXT_MENU} from "@/types/MAP"
// eslint-disable-next-line no-unused-vars
import EVESystem, {MapCoordinates} from "@/lib/EVESystem"
// eslint-disable-next-line no-unused-vars,no-undef
import Timeout = NodeJS.Timeout
import PerfectScrollbar from "perfect-scrollbar"
import {JB_DIRECTION_DIRECTION} from "@/lib/EVEJumpBride"
// eslint-disable-next-line no-unused-vars
import {IRegionMapExport} from "@/service/Database"
import * as log from "electron-log"
import {IWindowLayoutScroll} from "@/types/WidnowLayout";
import characterManager from "@/service/CharacterManager";

const JB_COLORS = ["800000", "808000", "BC8F8F", "ff00ff", "c83737", "FF6347", "917c6f", "ffcc00",
	"88aa00", "FFE4E1", "008080", "00BFFF", "4682B4", "00FF7F", "7FFF00", "ff6600",
	"CD5C5C", "FFD700", "66CDAA", "AFEEEE", "5F9EA0", "FFDEAD", "696969", "2F4F4F"]

interface JB_DATA {
	left: EVESystem
	direction: JB_DIRECTION_DIRECTION
	right: EVESystem
	out_region: boolean
}

const SCALE_FACTOR = 10

@Component({
	components: {RegionMapContextMenu},
	directives: {
		dragscroll,
	}
})
export default class RegionMap extends Vue {
	svgOrigWidth = 0
	svgScale = 100
	svgContent = ""
	isMapDragging = false
	// loadPercent = 0
	initMapData: IRegionMapExport | null = null

	containerW = 0
	containerH = 0

	markTime: number | null = null
	markTimer: Timeout | null = null
	markedSystem: EVESystem | null = null

	ps: PerfectScrollbar | null = null

	@Prop({
		type: Number
	}) cols!: number

	$refs!: {
		svgContainer: HTMLElement,
		contentContainer: Vue,
	}

	get isGlobalLoaded() {
		return this.$store.getters.isLoaded
	}

	get contentContainer(): HTMLElement {
		return this.$refs.contentContainer.$el as HTMLElement
	}

	get svgContainer(): HTMLElement {
		return this.$refs.svgContainer
	}

	init() {
		if (this.markTimer) {
			clearInterval(this.markTimer)
		}
		this.markedSystem = null
		this.markTime = null
	}

	@Watch("isGlobalLoaded")
	isGlobalLoadedWatcher(val) {
		if (val) {
			this.loadMap()
		}
	}

	created() {
		events.$on("setRegionMap", this.setMap)
		events.$on("updateLocationMarker", this.updateLocationMarker)
		events.$on("markSystem", this.markSystem)
		events.$on("regionMap:set:scroll", this.setScroll)
	}

	setScroll(scroll: IWindowLayoutScroll) {
		if (!this.svgContainer) return

		this.setSVGScale(Number(scroll.scale))
		this.svgContainer.scrollTo({
			left: Number(scroll.left),
			top: Number(scroll.top),
		})
	}

	mounted() {
		this.svgContainer.addEventListener("click", this.containerClicked)
		this.svgContainer.addEventListener("contextmenu", this.contextMenuOpen)

		this.ps = Object.preventExtensions(new PerfectScrollbar(this.svgContainer, {wheelPropagation: false}))

		events.$on("electron:window:layouts:get:mapscroll", (event, uuid: string) => {
			events.sendToLayouts("window:layouts:set:mapscroll", {
				left: this.svgContainer.scrollLeft,
				top: this.svgContainer.scrollTop,
				scale: this.svgScale,
				uuid,
			})
		})
	}

	containerClicked(event: Event) {
		event.preventDefault()
		// console.warn("click", event.target)
	}

	contextMenuOptions: I_CONTEXT_MENU = {
		show: false,
		x: 0,
		y: 0,
		system_id: 0,
	}

	contextMenuOpen(event: MouseEvent) {
		event.preventDefault()
		if (this.contextMenuOptions.show) this.contextMenuOptions.show = false

		const target = event.target as HTMLElement

		if (
			!event
			|| !target
			|| target.nodeName !== "use"
			|| !target.id
		) {
			return
		}

		const match = target.id.match(/^sys(?<system_id>\d+)$/)

		if (
			!match
			|| !match.groups
			|| !match.groups.system_id
		) {
			return
		}

		const system_id = Number(match.groups.system_id)

		if (!system_id) return

		this.contextMenuOptions = {
			show: true,
			x: event.x,
			y: event.y,
			system_id,
		}
	}

	mousedown(event: MouseEvent) {
		if (event.which === 4 || event.which === 5) return
		this.svgContainer.classList.add("isMapDragging")
	}

	mouseup(event: MouseEvent) {
		if (event.which === 4 || event.which === 5) return
		this.svgContainer.classList.remove("isMapDragging")
	}

	onScroll(event: WheelEvent) {
		event.preventDefault()
		event.stopImmediatePropagation()

		let scale = SCALE_FACTOR

		if (Math.sign(event.deltaY) > 0) scale *= -1
		const newScale = this.svgScale + scale

		this.setSVGScale(newScale >= 10 ? newScale : 10)
	}

	setSVGScale(scale: number) {
		const svg = this.svgContainer.querySelector("svg")
		this.svgScale = scale

		if (svg) {
			svg.style.width = this.svgScale + "%"
			svg.style.height = this.svgScale + "%"
			this.$nextTick(() => this.ps!.update())
		}
	}

	get isJBShow() {
		return this.$store.getters.isJBShow
	}

	@Watch("isJBShow")
	switchJB(isJBShow) {
		this.svgContainer
			.querySelectorAll(".jumpbridge")
			.forEach(node => node.setAttribute("visibility", isJBShow ? "visible" : "hidden"))
	}

	setMap(map: IRegionMapExport) {
		this.initMapData = map
		this.loadMap()
	}

	async loadMap() {
		if (!this.isGlobalLoaded || !this.initMapData) return
		log.debug("RegionMap, start loading svg")
		this.init()
		// this.loadPercent = 10

		const chee = cheerio.load(this.initMapData.svg)
		chee("script").remove()
		chee("#controls").remove()
		const svg = chee("svg")
		svg.addClass("pa-3")
		svg.removeAttr("onload")
		svg.attr("style", `width:${this.svgScale}%;height:${this.svgScale}%`)
		svg.removeAttr("height")
		svg.removeAttr("width")
		const viewBox = svg.attr("viewBox").split(" ")
		this.svgOrigWidth = viewBox[2]

		JB_COLORS.forEach(jbColor => {
			svg.prepend(`
      	<marker viewBox="0 0 20 20" id="arrowstart_${jbColor}"
      	  markerUnits="strokeWidth" markerWidth="20" markerHeight="15" refx="-25"
					refy="5" orient="auto" style="stroke:#${jbColor};fill:#${jbColor}"
				>
					<path d="M 0 0 L 10 5 L 0 10 z"></path>
				</marker>

				<marker viewBox="0 0 20 20" id="arrowend_${jbColor}"
      	  markerUnits="strokeWidth" markerWidth="20" markerHeight="15" refx="25"
					refy="5" orient="auto" style="stroke:#${jbColor};fill:#${jbColor}"
				>
					<path d="M 0 0 L 10 5 L 0 10 z"></path>
				</marker>

				<marker viewBox="0 0 20 20" id="arrowout_${jbColor}"
      	  markerUnits="strokeWidth" markerWidth="10" markerHeight="10"
      	  style="stroke:#${jbColor};fill:#${jbColor}"
				>
					<circle r="5"/>
				</marker>
      `)
		})

		// this.loadPercent = 20

		svg.prepend(`
        <g id="select_marker" opacity="0" transform="translate(0, 0)">
					<ellipse cx="0" cy="0" rx="56" ry="28" style="fill:#462CFF"></ellipse>
					<line x1="0" y1="-10000" x2="0" y2="0" style="stroke:#462CFF"></line>
					<line x1="-10000" y1="0" x2="0" y2="0" style="stroke:#462CFF"></line>
					<line x1="10000" y1="0" x2="0" y2="0" style="stroke:#462CFF"></line>
					<line x1="0" y1="10000" x2="0" y2="0" style="stroke:#462CFF"></line>
        </g>
			`)
		//
		// svg.prepend(`
		//     <g id="char_marker" opacity="0"  transform="translate(0, 0)">
		// 			<ellipse cx="0" cy="0" rx="0" ry="0" style="fill:#8B008D"></ellipse>
		//     </g>
		// 	`)

		chee("#jumps > line").removeClass().addClass("j")
		chee("defs > symbol rect").css("fill", "#FFFFFF")
		chee("defs > symbol text.st").removeClass("so")

		chee("defs > symbol").each((index, symbol) => {
			chee(chee(symbol).find("text").eq(1)).text("?")
		})

		const uses: { [key: number]: MapCoordinates } = {}

		chee("#sysuse > use").each((index, use) => {
			const href = use.attribs["href"]
			const id = Number(href.substring(4))
			uses[id] = {
				x: parseFloat(use.attribs["x"]),
				y: parseFloat(use.attribs["y"]),
				width: parseFloat(use.attribs["width"]),
				height: parseFloat(use.attribs["height"]),
				center_x: 0.0,
				center_y: 0.0,
			}
			uses[id].center_x = (uses[id].x + (uses[id].width / 2))
			uses[id].center_y = (uses[id].y + (uses[id].height / 2))
		})

		chee("defs > symbol").each((index, element) => {
			const symbol = chee(element)
			const idString = symbol.attr("id").substring(3)

			if (!idString || idString.length !== 8) return

			const id = Number(idString)
			if (id.toString() !== idString) return

			// const name = chee(symbol.find("text")[0]).text()
			// NOTE not all systems has dashes
			// if (!name.includes("-")) {
			// 	return
			// }

			systemManager.systemSetMap(id, uses[id], this.svgContainer)
		})

		await this.parseJB(chee("#jumps"))

		this.svgContent = cheerio.html(svg)

		this.$nextTick(() => {
			systemManager.showRegion()
			this.updateLocationMarker()
			this.switchJB(this.isJBShow)
		})
	}

	async parseJB(jumps: any) {
		const jbData: JB_DATA[] = []

		let jbs = new Set<number>()

		systemManager.jb.forEach(jb => {
			if (!systemManager.currentRegion) return

			const systemFrom = jb.systemFrom
			const systemTo = jb.systemTo

			if (
				!systemFrom
				|| !systemTo
				|| (
					!systemManager.currentRegion.systems.includes(systemFrom)
					&& !systemManager.currentRegion.neighbourSystems.includes(systemFrom)
				)
			) {
				return
			}

			if (jbs.has(systemFrom.id)) return

			jbs.add(systemFrom.id)
			jbs.add(systemTo.id)

			let direction: JB_DIRECTION_DIRECTION =
				systemManager.jbBySystemId[systemTo.id] ? JB_DIRECTION_DIRECTION.TO_BOTH : JB_DIRECTION_DIRECTION.TO_RIGHT
			// JB_DIRECTION_DIRECTION.TO_RIGHT

			jbData.push({
				left: systemFrom,
				direction: direction,
				right: systemTo,
				out_region: systemTo.region_id !== systemManager.currentRegion?.id,
			})
		})

		log.info("RegionMap %d, JB found", systemManager.currentRegion?.id, jbData.length)

		let colorCount = 0
		jbData.forEach(jb => {
			if (colorCount > JB_COLORS.length - 1) colorCount = 0
			const jbColor = JB_COLORS[colorCount]
			colorCount += 1

			let direction = ""

			if (jb.direction === JB_DIRECTION_DIRECTION.TO_RIGHT) {
				direction += ` marker-start="url(#arrowstart_${jbColor})"`

				if (!jb.out_region) {
					direction += ` marker-end="url(#arrowend_${jbColor})"`
				}
			}

			if (jb.out_region) {
				direction += ` marker-end="url(#arrowout_${jbColor})"`
			}

			let jump_svg = `
				<line
				  x1="${jb.left.mapCoordinates!.center_x + 2}"
					y1="${jb.left.mapCoordinates!.center_y + 2}"
					x2="${jb.out_region ? (jb.left.mapCoordinates!.center_x - 40) : (jb.right.mapCoordinates!.center_x - 2)}"
					y2="${jb.out_region ? (jb.left.mapCoordinates!.center_y - 30) : (jb.right.mapCoordinates!.center_y - 2)}"
					style="stroke:#${jbColor}"
					visibility="hidden"
					stroke-width="2" class="jumpbridge"
					stroke-dasharray="2"
					${direction}
				></line>
				<rect
					x="${jb.left.mapCoordinates!.x - 3}"
					y="${jb.left.mapCoordinates!.y - 1}"
					width="${jb.left.mapCoordinates!.width + 1.5}"
					height="${jb.left.mapCoordinates!.height + 1.5}"
					style="fill:#${jbColor};stroke:#${jbColor};stroke-width:1.5;fill-opacity:0.4"
					visibility="hidden"
					class="jumpbridge"></rect>
			`
			if (!jb.out_region) {
				jump_svg +=
					`
					<rect
					x="${jb.right.mapCoordinates!.x - 3}"
					y="${jb.right.mapCoordinates!.y - 1}"
					width="${jb.right.mapCoordinates!.width + 1.5}"
					height="${jb.right.mapCoordinates!.height + 1.5}"
					style="fill:#${jbColor};stroke:#${jbColor};stroke-width:1.5;fill-opacity:0.4"
					visibility="hidden"
					class="jumpbridge"></rect>
				`
			}
			jumps.prepend(jump_svg)
		})
	}

	updateLocationMarker() {
		if (!systemManager.currentRegion) return

		const systemsToCharacters = characterManager.regionSystemToChars[systemManager.currentRegion.id]
		const markers = this.svgContainer.querySelectorAll(".char_marker")

		const characterToAdd = new Set<string>()

		if (systemsToCharacters) {
			for (const [, characterNames] of Object.entries(systemsToCharacters)) {
				characterNames.forEach((characterName) => characterToAdd.add(characterName))
			}
		}

		markers.forEach(marker => {
			const systemID = marker.getAttribute("data-system-id")
			const characterName = marker.getAttribute("data-character-name")

			// broken marked, delete
			if (!systemID || !characterName) {
				marker.remove()
				return
			}

			// char in correct system but we may need to refresh color
			// if (systemsToCharacters[systemID!]?.has(characterName)) {
			// 	characterToAdd.delete(characterName)
			// 	return
			// }

			// no system for char found
			const systemNew = characterManager.characters[characterName]?.system
			if (!systemNew || !systemNew.mapCoordinates) {
				marker.remove()
				return
			}

			marker.setAttribute("data-system-id", systemNew.id as unknown as string)

			const markerEclipse = marker.firstElementChild // .querySelector("ellipse")

			if (!markerEclipse) {
				marker.remove()
				return
			}

			markerEclipse.setAttribute("cx", systemNew.mapCoordinates.center_x - 2.5 as unknown as string)
			markerEclipse.setAttribute("cy", systemNew.mapCoordinates.center_y as unknown as string)
			markerEclipse.setAttribute("rx", (systemNew.mapCoordinates.width / 2) + 4 as unknown as string)
			markerEclipse.setAttribute("ry", (systemNew.mapCoordinates.height / 2) + 4 as unknown as string)

			markerEclipse.setAttribute("style",
				characterName === characterManager.activeCharacter?.name ? "fill:#8B008D" : "fill:#FB00FF"
			)

			characterToAdd.delete(characterName)
		})

		characterToAdd.forEach(characterName => {
			const system = characterManager.characters[characterName].system

			if (!system || !system.mapCoordinates) {
				return
			}

			const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g')
			marker.setAttribute("data-system-id", system.id as unknown as string)
			marker.setAttribute("data-character-name", characterName)
			marker.classList.add("char_marker")

			const markerEclipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse')
			marker.appendChild(markerEclipse)

			markerEclipse.setAttribute("cx", system.mapCoordinates.center_x - 2.5 as unknown as string)
			markerEclipse.setAttribute("cy", system.mapCoordinates.center_y as unknown as string)
			markerEclipse.setAttribute("rx", (system.mapCoordinates.width / 2) + 4 as unknown as string)
			markerEclipse.setAttribute("ry", (system.mapCoordinates.height / 2) + 4 as unknown as string)
			markerEclipse.setAttribute("style",
				characterName === characterManager.activeCharacter?.name ? "fill:#8B008D" : "fill:#fb00ff"
			)

			this.svgContainer.querySelector("svg")?.prepend(marker)
		})
	}

	markSystem(system: EVESystem) {
		if (this.markTimer) {
			clearInterval(this.markTimer)
		}
		this.markedSystem = system
		this.markTime = null

		this.markSystemInternal()
	}

	markSystemInternal() {
		if (!this.markedSystem) {
			if (this.markTimer) {
				clearInterval(this.markTimer)
			}
			return;
		}

		const marker = this.svgContainer.querySelector("#select_marker")

		if (!marker) return

		if (this.markTime) {
			const diffMs = new Date().getTime() - this.markTime

			let diff = (1 - (diffMs / 10000))
			if (diff <= 0) {
				diff = 0
				if (this.markTimer) {
					clearInterval(this.markTimer)
				}
			}
			marker.setAttribute("opacity", diff.toString())
		} else {
			if (!this.markedSystem.mapCoordinates) return

			const x = this.markedSystem.mapCoordinates.center_x
			const y = this.markedSystem.mapCoordinates.center_y + 1

			marker.setAttribute("opacity", "1")
			marker.setAttribute("transform", `translate(${x},${y})`)
			this.markTime = new Date().getTime()
			this.markTimer = setInterval(this.markSystemInternal.bind(this), 100)
		}
	}
}
</script>


<style lang="scss" scoped>
@import '~perfect-scrollbar/css/perfect-scrollbar.css';

.svg-container {
	position: relative;
	//height: calc(100vh - 30px);
	height: 100%;
	border-right: 1px solid rgba(0, 0, 0, 0.25);
	border-left: 1px solid rgba(0, 0, 0, 0.25);
}

.content-container {
	height: 100%;
}

.isMapDragging, .isMapDragging a {
	cursor: grabbing !important;
}
</style>
