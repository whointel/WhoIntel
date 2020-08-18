<template>
	<v-app>
		<window-chrome/>
		<path-finder/>
		<v-main :class="showTopPanel ? 'main-container-window-chrome-gap' : 'main-container-window-chrome-nogap'">
			<loader-main/>
			<v-row no-gutters :class="showTopPanel ? 'main-container-window-chrome-gap' : 'main-container-window-chrome-nogap'">
				<fleet v-if="isFleetShow"/>
				<region-map :cols="mapCols"/>
				<log-list v-if="isLogsShow"/>
			</v-row>
		</v-main>
		<about-window/>
		<config-window/>
		<api-popup/>
		<error-popup/>
		<like-dislike-window v-if="showLikeDisLikeWindow" @close="showLikeDisLikeWindow = false"/>

		<eden-map-popup @close="isEdenShow = false" v-if="isEdenShow"/>
	</v-app>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import ApiPopup from "@/components/ApiPopup.vue"
import WindowChrome from "@/components/WindowChrome/WindowChrome.vue"
import AboutWindow from "@/components/AboutWindow.vue"
import ConfigWindow from "@/components/Config/ConfigWindow.vue"
import RegionMap from "@/components/RegionMap.vue"
import LogList from "@/components/LogList.vue"
import PathFinder from "@/components/PathFinder.vue"
import events from "@/service/EventBus"
import settingsService from "@/service/settings"
import Fleet from "@/components/Fleet.vue"
import ErrorPopup from "@/components/ErrorPopup.vue"
import LikeDislikeWindow from "@/components/LikeDislikeWindow.vue";
import EdenMapPopup from "@/components/EdenMapPopup.vue";
import LoaderMain from "@/components/LoaderMain.vue";

@Component({
	components: {
		LoaderMain,
		EdenMapPopup,
		LikeDislikeWindow,
		ErrorPopup,
		Fleet,
		PathFinder,
		LogList,
		RegionMap,
		ApiPopup,
		WindowChrome,
		AboutWindow,
		ConfigWindow,
	},
})
export default class App extends Vue {
	showLikeDisLikeWindow = false
	isEdenShow = false

	created() {
		events.$on("showLikeDisLikeWindow", () => this.showLikeDisLikeWindow = true)
		events.$on("showNewEden", () => this.isEdenShow = true)
	}

	mounted() {
		events.$on("electron:app-command:browser-backward", () => {
			this.emitNavigationBtn("back")
		})
		events.$on("electron:app-command:browser-forward", () => {
			this.emitNavigationBtn("forward")
		})
		window.document.addEventListener("mousedown", (event: MouseEvent) => {
			if (event.which === 4) {
				event.preventDefault()
				this.emitNavigationBtn("back")
			}
			if (event.which === 5) {
				event.preventDefault()
				this.emitNavigationBtn("forward")
			}
		})
	}

	emitNavigationBtn(btn: string) {
		if (settingsService.$.useNavigationBtn) events.$emit(`btn:${btn}`)
	}

	get isFleetShow() {
		return this.$store.getters.showFleet
	}

	get isLogsShow() {
		return this.$store.getters.showLogsPanel
	}

	get mapCols(): number {
		return 12 - (this.isFleetShow ? 2 : 0) - (this.isLogsShow ? 3 : 0)
	}

	get showTopPanel(): boolean {
		return this.$store.getters.showTopPanel
	}
}
</script>

<style lang="scss">
.main-container-window-chrome-gap {
	height: calc(100vh - 30px);
}

.main-container-window-chrome-nogap {
	height: 100vh;
	padding-top: 0 !important;
}
</style>
