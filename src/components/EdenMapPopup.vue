<template>
	<v-dialog v-model="dialog" :transition="false">
		<v-card>
			<div
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
			</div>
		</v-card>

		<v-btn
			fab top right fixed small
			@click="dialog = false"
		>
			<v-icon>mdi-close</v-icon>
		</v-btn>

	</v-dialog>
</template>

<script lang="ts">
import {Component, Vue, Watch} from "vue-property-decorator"
import events from "@/service/EventBus"
import cheerio from "cheerio"
import systemManager from "@/service/SystemManager"
import {dragscroll} from "vue-dragscroll"
import EVESystem, {MapCoordinates} from "@/lib/EVESystem"
import PerfectScrollbar from "perfect-scrollbar"
import {IRegionMapExport} from "@/service/Database"
import * as log from "electron-log"

const SCALE_FACTOR = 10

@Component({
	directives: {
		dragscroll,
	}
})
export default class EdenMapPopup extends Vue {
	dialog = true

	@Watch("dialog")
	dialogCloser(val) {
		if (!val) this.$emit("close")
	}

	svgOrigWidth = 0
	svgScale = 100
	svgContent = ""
	isMapDragging = false

	initMapData: IRegionMapExport | null = null

	containerW = 0
	containerH = 0

	ps: PerfectScrollbar | null = null

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

	@Watch("isGlobalLoaded")
	isGlobalLoadedWatcher(val) {
		if (val) {
			this.loadMap()
		}
	}

	created() {
		events.$on("showRegionMapNewEden", this.setMap)
		events.$on("hideRegionMapNewEden", this.hideThisPopup)
		systemManager.loadNewEdenRegion()
	}

	beforeDestroy() {
		events.$off("showRegionMapNewEden", this.setMap)
		events.$off("hideRegionMapNewEden", this.hideThisPopup)
	}

	hideThisPopup() {
		this.dialog = false
	}

	mounted() {
		this.svgContainer.addEventListener("click", this.containerClicked)
		this.ps = Object.preventExtensions(new PerfectScrollbar(this.svgContainer, {wheelPropagation: false}))
	}

	containerClicked(event: MouseEvent) {
		event.preventDefault()
		const target = event.target as HTMLElement

		if (
			!event
			|| !target
			|| target.nodeName !== "use"
			|| !target.id
		) {
			return
		}

		const match = target.id.match(/^sys(?<region_id>\d+)$/)

		if (
			!match
			|| !match.groups
			|| !match.groups.region_id
		) {
			return
		}

		const region_id = Number(match.groups.region_id)

		if (!region_id) return

		this.dialog = false
		systemManager.setCurrentRegion(region_id)
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

	setMap(map: IRegionMapExport) {
		this.initMapData = map
		this.loadMap()
	}

	async loadMap() {
		if (!this.isGlobalLoaded || !this.initMapData) return
		log.debug("NewEdenMap, start loading svg")

		const chee = cheerio.load(this.initMapData.svg);
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

		this.svgContent = cheerio.html(svg)
	}
}
</script>


<style lang="scss" scoped>
@import '~perfect-scrollbar/css/perfect-scrollbar.css';

.svg-container {
	position: relative;
	height: 90vh;
}

.isMapDragging, .isMapDragging a {
	cursor: grabbing !important;
}
</style>
