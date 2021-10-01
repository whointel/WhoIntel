<template>
	<v-col
		:cols="cols"
		class="content-container"
	>
		<div
			@wheel="onScroll"
			@mousedown="mousedown"
			@dragscrollend="mouseup"
			@mouseup="mouseup"
			ref="svgContainer"
			v-dragscroll.noback.noforward="true"
			class="svg-container"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 1024 768"
				:style="`width:${this.svgScale}%;height:${this.svgScale}%`"
				class="pa-3"
			>
				<region-map-system-marker/>
				<region-map-character-marker/>
				<region-map-jump-bridges/>

				<svg
					v-html="svgContent"
					ref="svgContentContainer"
				/>

				<region-map-path-points/>
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
import {CONTEXT_MENU} from "@/types/RegionMap"
import {MapCoordinates} from "@/lib/EVESystem"
import PerfectScrollbar from "perfect-scrollbar"
import * as log from "electron-log"
import {IWindowLayoutScroll} from "@/types/WidnowLayout"
import RegionMapContextMenu from "@/components/RegionMap//RegionMapContextMenu.vue"
import RegionMapPathPoints from "@/components/RegionMap/RegionMapPathPoints.vue"
import RegionMapJumpBridges from "@/components/RegionMap/RegionMapJumpBridges.vue"
import RegionMapSystemMarker from "@/components/RegionMap/RegionMapSystemMarker.vue"
import RegionMapCharacterMarker from "@/components/RegionMap/RegionMapCharacterMarker.vue"

const SCALE_FACTOR = 10

@Component({
	components: {
		RegionMapCharacterMarker,
		RegionMapSystemMarker,
		RegionMapJumpBridges,
		RegionMapPathPoints,
		RegionMapContextMenu,
	},
	directives: {
		dragscroll,
	}
})
export default class RegionMap extends Vue {
	@Prop({
		type: Number
	}) cols!: number

	$refs!: {
		svgContainer: HTMLElement,
		svgContentContainer: SVGElement,
	}

	svgScale = 100
	svgContent = ""
	isMapDragging = false

	containerW = 0
	containerH = 0

	ps: PerfectScrollbar | null = null

	contextMenuOptions: CONTEXT_MENU = {
		show: false,
		x: 0,
		y: 0,
		system_id: 0,
	}

	get currentRegion() {
		return systemManager.currentRegion
	}

	get svgContainer(): HTMLElement {
		return this.$refs.svgContainer
	}

	get svgContentContainer(): SVGElement {
		return this.$refs.svgContentContainer
	}

	beforeDestroy() {
		this.svgContainer.removeEventListener("click", this.markNeighbourRegionSystem)
		this.svgContainer.removeEventListener("contextmenu", this.contextMenuOpen)
		events.$off("electron:window:layouts:get:MapScroll", this.sendMapScroll)
		events.$off("regionMap:set:scroll", this.setScroll)
		if (this.ps) this.ps.destroy()
	}

	created() {
		events.$on("regionMap:set:scroll", this.setScroll)
	}

	mounted() {
		this.svgContainer.addEventListener("click", this.markNeighbourRegionSystem)
		this.svgContainer.addEventListener("contextmenu", this.contextMenuOpen)
		events.$on("electron:window:layouts:get:MapScroll", this.sendMapScroll)

		// wait for rendering component, fix PerfectScrollbar glitch
		this.$nextTick(() => {
			this.ps = Object.preventExtensions(new PerfectScrollbar(this.svgContainer, {wheelPropagation: false}))
		})

		// fix map reloading for dev server
		this.loadMap()
	}

	@Watch("currentRegion", {immediate: false})
	async loadMap() {
		if (!this.currentRegion) return

		log.debug("RegionMap, start parsing svg")

		const chee = cheerio.load(this.currentRegion.svg)
		chee("script").remove()
		chee("#controls").remove()
		const svg = chee("svg")

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

		this.svgContent = cheerio.html(svg)

		// map need to be rendered
		this.$nextTick(() => {
			systemManager.showRegion()
		})
	}

	sendMapScroll(event, uuid: string) {
		events.sendToLayouts("window:layouts:set:MapScroll", {
			left: this.svgContainer.scrollLeft,
			top: this.svgContainer.scrollTop,
			scale: this.svgScale,
			uuid,
		})
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
			systemManager.markSystem(system, true)
		}
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
</style>

<style lang="sass">
@import "src/scss/theme"

+theme-glob(svg-container) using($material)
	#legend text
		fill: rgba(map-deep-get($material, 'text', 'primary'), 0.7)

	#legend rect:nth-child(n):nth-child(-n+5)
		fill: map-get($material, 'background')

	.alertIDLE
		a > rect
			fill: map-get($material, 'background')

		a > text
			fill: map-get($material, 'alertIDLE-text')

	.alertS1
		a > rect
			fill: map-get($material, 'alertS1-bg')

		a > text
			fill: map-get($material, 'alertS1-text')

	.alertS2
		a > rect
			fill: map-get($material, 'alertS2-bg')

		a > text
			fill: map-get($material, 'alertS2-text')

	.alertS3
		a > rect
			fill: map-get($material, 'alertS3-bg')

		a > text
			fill: map-get($material, 'alertS3-text')

	.alertS4
		a > rect
			fill: map-get($material, 'alertS4-bg')

		a > text
			fill: map-get($material, 'alertS4-text')

	.alertClear1
		a > rect
			fill: map-get($material, 'alertClear1-bg')

		a > text
			fill: map-get($material, 'alertClear1-text')

	.alertClear2
		a > rect
			fill: map-get($material, 'alertClear2-bg')

		a > text
			fill: map-get($material, 'alertClear2-text')
</style>
