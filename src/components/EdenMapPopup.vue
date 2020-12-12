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
			@click="hideThisPopup"
		>
			<v-icon>mdi-close</v-icon>
		</v-btn>

	</v-dialog>
</template>

<script lang="ts">
import {Component, Vue, Watch} from "vue-property-decorator"
import cheerio from "cheerio"
import systemManager from "@/service/SystemManager"
import {dragscroll} from "vue-dragscroll"
import PerfectScrollbar from "perfect-scrollbar"
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

	svgScale = 100
	svgContent = ""
	isMapDragging = false

	containerW = 0
	containerH = 0

	ps: PerfectScrollbar | null = null

	$refs!: {
		svgContainer: HTMLElement,
		contentContainer: Vue,
	}

	get isAppReady() {
		return this.$store.getters.isAppReady
	}

	get contentContainer(): HTMLElement {
		return this.$refs.contentContainer.$el as HTMLElement
	}

	get svgContainer(): HTMLElement {
		return this.$refs.svgContainer
	}

	get currentRegion() {
		return systemManager.currentRegion
	}

	@Watch("isAppReady", {immediate: true})
	async loadMap() {
		const region = await systemManager.loadNewEdenRegion()
		log.debug("NewEdenMap, start loading svg")

		const chee = cheerio.load(region.svg)
		chee("script").remove()
		chee("#controls").remove()
		// TODO check for valid svg
		const svg = chee("svg")
		svg.addClass("pa-3")
		svg.removeAttr("onload")
		svg.attr("style", `width:${this.svgScale}%;height:${this.svgScale}%`)
		svg.removeAttr("height")
		svg.removeAttr("width")

		const regionID = systemManager.currentRegion?.id

		if (regionID) {
			chee("#sysuse > use").each((index, use) => {
				use = use as cheerio.TagElement

				const href = use.attribs["href"]
				const id = Number(href.substring(4)) // eg xlink:href="#def10000001"
				if (id !== regionID) return

				const uses = {
					x: parseFloat(use.attribs["x"]),
					y: parseFloat(use.attribs["y"]),
					width: parseFloat(use.attribs["width"]),
					height: parseFloat(use.attribs["height"]),
					center_x: 0.0,
					center_y: 0.0,
				}
				uses.center_x = (uses.x + (uses.width / 2))
				uses.center_y = (uses.y + (uses.height / 2))

				svg.prepend(`
					<g>
						<ellipse
						cx="${uses.center_x - 2.5}"
						cy="${uses.center_y}"
						rx="${(uses.width / 2) + 4}"
						ry="${(uses.height / 2) + 4}"
						style="fill:#8B008D"></ellipse>
					</g>
				`)
			})
		}

		this.svgContent = cheerio.html(svg)
	}

	@Watch("currentRegion", {immediate: false})
	onChangeCurrentRegion() {
		this.hideThisPopup()
	}

	beforeDestroy() {
		this.svgContainer.removeEventListener("click", this.containerClicked)
		if (this.ps) this.ps.destroy()
	}

	mounted() {
		this.svgContainer.addEventListener("click", this.containerClicked)
		this.ps = Object.preventExtensions(new PerfectScrollbar(this.svgContainer, {wheelPropagation: false}))
	}

	hideThisPopup() {
		this.dialog = false
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
