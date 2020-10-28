<template>
	<v-col
		:cols="cols"
		class="content-container"
	>
		<div
			ref="svgContainer"
			class="svg-container"
			@wheel="onScroll"
			@mousedown="mousedown"
			@dragscrollend="mouseup"
			@mouseup="mouseup"
			v-dragscroll.noback.noforward="true"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				xmlns:xlink="http://www.w3.org/1999/xlink"
				viewBox="0 0 1024 768"
				:style="`width:${this.svgScale}%;height:${this.svgScale}%`"
				class="pa-3"
			>

				<!-- selected system marker -->
				<g
					v-if="selectSystemMarker.visible && canShowMarkers"
					:transform="`translate(${selectSystemMarker.x}, ${selectSystemMarker.y})`"
					id="system-marker"
				>
					<ellipse cx="0" cy="0" rx="56" ry="28" fill="#462CFF"></ellipse>
					<line x1="0" y1="-10000" x2="0" y2="0" stroke="#462CFF"></line>
					<line x1="-10000" y1="0" x2="0" y2="0" stroke="#462CFF"></line>
					<line x1="10000" y1="0" x2="0" y2="0" stroke="#462CFF"></line>
					<line x1="0" y1="10000" x2="0" y2="0" stroke="#462CFF"></line>
				</g>
				<!-- / selected system marker -->

				<!-- character markers -->
				<g v-if="canShowMarkers" v-for="marker in characterMarkers" :key="marker.name">
					<ellipse
						:cx="marker.cx" :cy="marker.cy"
						:rx="marker.rx" :ry="marker.ry"
						:fill="marker.color"
					/>
				</g>
				<!-- / character markers -->

				<!-- Jump Bridges -->
				<g v-if="canShowMarkers" v-for="jb in jumpBridges" :key="jb.id">
					<line
						:x1="jb.x1" :y1="jb.y1"
						:x2="jb.x2" :y2="jb.y2"
						:stroke="'#' + jb.color"
						stroke-width="2"
						stroke-dasharray="2"
						:marker-start="jb.markerStart"
						:marker-end="jb.markerEnd"
					/>
					<rect
						:x="jb.rectLeft.x" :y="jb.rectLeft.y"
						:stroke="'#' + jb.color"
						stroke-width="1.5"
						:fill="'#' + jb.color"
						fill-opacity="0.4"
						:width="jb.rectLeft.width"
						:height="jb.rectLeft.height"
					/>
					<rect
						v-if="jb.rectRight"
						:x="jb.rectRight.x" :y="jb.rectRight.y"
						:stroke="'#' + jb.color"
						stroke-width="1.5"
						:fill="'#' + jb.color"
						fill-opacity="0.4"
						:width="jb.rectRight.width"
						:height="jb.rectRight.height"
					/>
				</g>
				<!-- / Jump Bridges -->

				<svg
					v-html="svgContent"
					ref="svgContentContainer"
				/>

				<line
					v-if="canShowMarkers"
					v-for="(line, index) in pathFinderPoints"
					:key="index"
					:x1="line.x1" :y1="line.y1"
					:x2="line.x2" :y2="line.y2"
					:stroke="line.color"
					stroke-width="3"
					stroke-dasharray="4 1"
				/>
			</svg>
		</div>
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
import {CONTEXT_MENU} from "@/types/RegionMap"
import EVESystem, {MapCoordinates} from "@/lib/EVESystem"
import PerfectScrollbar from "perfect-scrollbar"
import {JB_DIRECTION_DIRECTION} from "@/lib/EVEJumpBridge"
import {IRegionMapExport} from "@/service/Database"
import * as log from "electron-log"
import {IWindowLayoutScroll} from "@/types/WidnowLayout"
import characterManager from "@/service/CharacterManager"
import {IPATHPOINT, IPATHPOINT_POINT} from "@/types/PathFinder"
import pathService from "@/service/PathService"
import Character from "@/lib/Character"
import {of, Subscription} from "rxjs"
import {delay} from "rxjs/operators"

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
	svgScale = 100
	svgContent = ""
	isMapDragging = false
	initMapData: IRegionMapExport | null = null

	containerW = 0
	containerH = 0

	ps: PerfectScrollbar | null = null

	@Prop({
		type: Number
	}) cols!: number

	$refs!: {
		svgContainer: HTMLElement,
		svgContentContainer: SVGElement,
	}

	get isAppReady() {
		return this.$store.getters.isAppReady
	}

	get svgContainer(): HTMLElement {
		return this.$refs.svgContainer
	}

	get svgContentContainer(): SVGElement {
		return this.$refs.svgContentContainer
	}

	@Watch("isAppReady")
	isAppReadyWatcher(val) {
		if (val) {
			this.loadMap()
		}
	}

	created() {
		events.$on("setRegionMap", this.setMap)
		events.$on("regionMap:set:scroll", this.setScroll)
	}

	setScroll(scroll: IWindowLayoutScroll) {
		if (!this.svgContainer) return

		this.setSVGScale(Number(scroll.scale))
		this.$nextTick(() => {
			this.svgContainer.scrollTo({
				left: Number(scroll.left),
				top: Number(scroll.top),
			})
		})
	}

	mounted() {
		this.svgContainer.addEventListener("click", this.markNeighbourRegionSystem)
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

	contextMenuOptions: CONTEXT_MENU = {
		show: false,
		x: 0,
		y: 0,
		system_id: 0,
	}

	menuOpenerDetectSystem(event: MouseEvent): number | null {
		const target = event.target as HTMLElement

		if (
			!event
			|| !target
			|| target.nodeName !== "use"
			|| !target.id
		) {
			return null
		}

		const match = target.id.match(/^sys(?<system_id>\d+)$/)

		if (
			!match
			|| !match.groups
			|| !match.groups.system_id
		) {
			return null
		}

		const system_id = Number(match.groups.system_id)

		if (!system_id) {
			return null
		}

		return system_id
	}

	markNeighbourRegionSystem(event: MouseEvent) {
		event.preventDefault()
		if (this.contextMenuOptions.show) this.contextMenuOptions.show = false

		const system_id = this.menuOpenerDetectSystem(event)

		if (!system_id) return

		const system = systemManager.getSystemById(system_id)

		if (!system) {
			return
		}

		if (system.region_id !== systemManager.currentRegion?.id) {
			systemManager.markSystem(system, true, true)
		}
	}

	contextMenuOpen(event: MouseEvent) {
		event.preventDefault()
		if (this.contextMenuOptions.show) this.contextMenuOptions.show = false

		const system_id = this.menuOpenerDetectSystem(event)

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
		this.svgScale = scale
		this.$nextTick(() => this.ps!.update())
	}

	get isJBShow() {
		return this.$store.getters.isJBShow
	}

	setMap(map: IRegionMapExport) {
		this.initMapData = map
		this.loadMap()
	}

	drawRegionId = 0

	async loadMap() {
		if (!this.isAppReady || !this.initMapData) return
		log.debug("RegionMap, start loading svg")

		const chee = cheerio.load(this.initMapData.svg)
		chee("script").remove()
		chee("#controls").remove()
		const svg = chee("svg")

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

		chee("#jumps > line").removeClass().addClass("j")
		chee("defs > symbol rect").removeAttr("style")
		chee("defs > symbol text.st").removeClass("so")

		chee("defs > symbol").each((index, symbol) => {
			chee(chee(symbol).find("text").eq(1)).text("?")
		})

		const uses: { [key: number]: MapCoordinates } = {}

		chee("#sysuse > use").each((index, use) => {
			const href = use.attribs["href"]
			const id = Number(href.substring(4)) // eg xlink:href="#def10000001"
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
			const idString = symbol.attr("id")?.substring(3)

			if (!idString || idString.length !== 8) return

			const id = Number(idString)
			if (id.toString() !== idString) return

			systemManager.systemSetMap(id, uses[id], this.svgContentContainer)
		})

		this.svgContent = svg.html() + ""

		const mapId = this.initMapData.id
		// map need to be rendered
		this.$nextTick(() => {
			systemManager.showRegion()
			this.drawRegionId = mapId
		})
	}

	get canShowMarkers(): boolean {
		// NOTE bug with double redraw map on region change
		// return !this.$store.getters.isLoading &&
		return this.drawRegionId === systemManager.currentRegion?.id
	}

	get jumpBridges(): any[] {
		if (!this.isJBShow) return []
		if (!this.canShowMarkers) return []

		const jbData: JB_DATA[] = []

		let jbs = new Set<number>()

		systemManager.jb.forEach(jb => {
			if (!systemManager.currentRegion) return

			const systemFrom = jb.systemFrom
			const systemTo = jb.systemTo

			if (
				!systemFrom
				|| !systemTo
			) {
				return
			}

			if (
				!systemManager.currentRegion.systems.includes(systemFrom)
				&& !systemManager.currentRegion.neighbourSystems.includes(systemFrom)
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
				left: systemFrom as EVESystem,
				direction: direction,
				right: systemTo as EVESystem,
				out_region: systemTo.region_id !== systemManager.currentRegion?.id,
			})
		})

		log.info("RegionMap %d, JB found", systemManager.currentRegion?.id, jbData.length)

		const result: any[] = []

		let colorCount = 0
		jbData.forEach(jb => {
			if (colorCount > JB_COLORS.length - 1) colorCount = 0
			const jbColor = JB_COLORS[colorCount]
			colorCount += 1

			let markerStart = ""
			let markerEnd = ""

			if (jb.direction === JB_DIRECTION_DIRECTION.TO_RIGHT) {
				markerStart = `url(#arrowstart_${jbColor})`

				if (!jb.out_region) {
					markerEnd = `url(#arrowend_${jbColor})`
				}
			}

			if (jb.out_region) {
				markerEnd = `url(#arrowout_${jbColor})`
			}

			result.push({
				id: `${jb.left.id}_${jb.right.id}`,
				x1: jb.left.mapCoordinates!.center_x + 2,
				y1: jb.left.mapCoordinates!.center_y + 2,
				x2: jb.out_region ? (jb.left.mapCoordinates!.center_x - 40) : (jb.right.mapCoordinates!.center_x + 2),
				y2: jb.out_region ? (jb.left.mapCoordinates!.center_y - 30) : (jb.right.mapCoordinates!.center_y + 2),
				color: jbColor,
				markerStart: markerStart,
				markerEnd: markerEnd,

				rectLeft: {
					x: jb.left.mapCoordinates!.x - 3,
					y: jb.left.mapCoordinates!.y - 1,
					width: jb.left.mapCoordinates!.width + 1.5,
					height: jb.left.mapCoordinates!.height + 1.5,
				},
				rectRight: jb.out_region ? null : {
					x: jb.right.mapCoordinates!.x - 3,
					y: jb.right.mapCoordinates!.y - 1,
					width: jb.right.mapCoordinates!.width + 1.5,
					height: jb.right.mapCoordinates!.height + 1.5,
				},
			})
		})

		return result
	}

	get pathFinderPoints(): IPATHPOINT[] {
		if (!this.canShowMarkers) return []

		let result: any[] = []
		let pathPoint: IPATHPOINT_POINT
		let pathPointNext: IPATHPOINT_POINT
		const currentRegionId = systemManager.currentRegion?.id

		for (let i = 0; i < pathService.pathPoints.path.length - 1; i++) {
			pathPoint = pathService.pathPoints.path[i]
			pathPointNext = pathService.pathPoints.path[i + 1]

			// jump start AND stop systems are not in current region, skip
			if (
				currentRegionId !== pathPoint.system.region_id
				&& currentRegionId !== pathPointNext.system.region_id
			) {
				continue
			}

			// jump start OR stop systems are not in current region, skip, TODO
			if (
				currentRegionId !== pathPoint.system.region_id
				|| currentRegionId !== pathPointNext.system.region_id
			) {
				continue
			}

			if (
				!pathPoint.system.mapCoordinates
				|| !pathPointNext.system.mapCoordinates
			) {
				continue
			}

			result.push({
				x1: pathPoint.system.mapCoordinates?.center_x + 4,
				y1: pathPoint.system.mapCoordinates?.center_y + 4,
				x2: pathPointNext.system.mapCoordinates?.center_x + 4,
				y2: pathPointNext.system.mapCoordinates?.center_y + 4,
				color: pathPoint.jb ? "green" : "orange",
			})
		}

		return result
	}

	get characterMarkers(): any[] {
		if (!systemManager.currentRegion) return []

		const systemsToCharacters = characterManager.regionSystemToChars[systemManager.currentRegion.id]

		if (!systemsToCharacters) return []

		let result: any[] = []

		for (const [, characters] of Object.entries(systemsToCharacters)) {
			characters.forEach(character => {
				const system = (character as Character).location

				if (!system || !system.mapCoordinates) {
					return
				}

				result.push({
					cx: system.mapCoordinates.center_x - 2.5,
					cy: system.mapCoordinates.center_y,
					rx: (system.mapCoordinates.width / 2) + 4,
					ry: (system.mapCoordinates.height / 2) + 4,
					color: character.name === characterManager.activeCharacter?.name ? "#8B008D" : "#FB00FF",
					name: character.name
				})
			})
		}

		return result
	}

	markSystem$: Subscription = new Subscription()

	get markedSystem() {
		return systemManager.markedSystem
	}

	// fix for re-mark same system - css animation doesn't see change
	canShowMarkedSystem = false

	get selectSystemMarker(): {
		x: number
		y: number
		visible: boolean
	} {
		if (
			!this.markedSystem
			|| !this.markedSystem.mapCoordinates
			|| this.markedSystem.region_id !== systemManager.currentRegion?.id
		) {
			return {
				x: 0,
				y: 0,
				visible: false,
			}
		}

		const x = this.markedSystem.mapCoordinates.center_x
		const y = this.markedSystem.mapCoordinates.center_y + 1

		return {
			x, y,
			visible: this.canShowMarkedSystem,
		}
	}

	@Watch("markedSystem")
	markSystem(system: EVESystem | null) {
		this.markSystem$.unsubscribe()
		this.canShowMarkedSystem = false

		if (!system) {
			return
		}

		// see definition for this.canShowMarkedSystem
		this.$nextTick(() => this.canShowMarkedSystem = true)

		this.markSystem$ = of([]).pipe(
			delay(10_000 /* same value as fadeOutSystemMarker animation css*/),
		).subscribe({complete: () => systemManager.unMarkSystem()})
	}
}
</script>

<style lang="scss">
.svg-container {
	position: relative;
	height: 100%;
}

.content-container {
	height: 100%;
	user-select: none;
}

.isMapDragging, .isMapDragging a {
	cursor: grabbing !important;
}

@keyframes fadeOutSystemMarker {
	0% {
		opacity: 1;
	}
	60% {
		opacity: 0.6;
	}
	100% {
		opacity: 0;
	}
}

#system-marker {
	animation: fadeOutSystemMarker 10s forwards;
}
</style>

<style lang="sass">
@import "src/scss/theme"

+theme-glob(svg-container) using($material)
	#legend text
		fill: rgba(map-deep-get($material, 'text', 'primary'), 0.7)

	#legend rect
		fill: map-get($material, 'background')

	.alertIDLE
		rect
			fill: map-get($material, 'background')

		text
			fill: map-get($material, 'alertIDLE-text')

	.alertS1
		rect
			fill: map-get($material, 'alertS1-bg')

		text
			fill: map-get($material, 'alertS1-text')

	.alertS2
		rect
			fill: map-get($material, 'alertS2-bg')

		text
			fill: map-get($material, 'alertS2-text')

	.alertS3
		rect
			fill: map-get($material, 'alertS3-bg')

		text
			fill: map-get($material, 'alertS3-text')

	.alertS4
		rect
			fill: map-get($material, 'alertS4-bg')

		text
			fill: map-get($material, 'alertS4-text')

	.alertClear1
		rect
			fill: map-get($material, 'alertClear1-bg')

		text
			fill: map-get($material, 'alertClear1-text')

	.alertClear2
		rect
			fill: map-get($material, 'alertClear2-bg')

		text
			fill: map-get($material, 'alertClear2-text')
</style>
