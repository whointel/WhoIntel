<template>
	<v-system-bar
		v-show="showTopPanel"
		class="titlebar"
		:class="{'titlebar--blurred': !isFocus}"
		:height="30"
		app dark
	>
		<v-row class="align-center mx-0">
			<div class="titlebar-hamburger titlebar--nodrag mr-1 d-flex" v-if="isPlatformWindows">
				<button
					title="Menu" class="titlebar-button"
					@click="openMenu"
					@contextmenu="openMenu"
				>
					<svg width="18" viewBox="0 0 24 15.5" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M0 0H24V1.5H0ZM0 7H24V8.5H0ZM0 14H24V15.5H0Z" fill="#D8DEE9"></path>
					</svg>
				</button>
			</div>

			<div class="ml-1 mr-4 mt-1 d-none d-md-flex">
				<span>WhoIntel</span>
			</div>
			<j-b-btn class="titlebar--nodrag d-none d-sm-flex"/>
			<z-k-b-btn class="titlebar--nodrag ml-2 d-none d-sm-flex"/>
			<path-finder-btn class="titlebar--nodrag ml-2 d-none d-sm-flex"/>
			<ext-win-btn class="titlebar--nodrag ml-2 d-none d-sm-flex"/>
			<fleet-btn class="titlebar--nodrag ml-2 d-none d-sm-flex"/>
			<overlay-btn class="titlebar--nodrag ml-2 d-none d-sm-flex"/>
			<regions-menu class="titlebar--nodrag ml-3 d-flex"/>
			<history-btn class="titlebar--nodrag ml-4 d-none d-md-flex"/>
			<v-spacer/>
			<portal-target name="chrome-window-btn" class="titlebar--nodrag mr-2 d-none d-sm-flex"/>
			<portal-target name="chrome-window-info" class="d-none d-sm-flex"/>
			<!--						<test-btn class="titlebar&#45;&#45;nodrag ml-4"/>-->
			<v-spacer/>
			<search class="titlebar--nodrag ml-4 d-none d-md-flex"/>
			<no-log-channels-alarm class="titlebar--nodrag ml-4 d-none d-sm-flex"/>
			<show-l-d-btn class="titlebar--nodrag ml-4 d-none d-md-flex"/>
			<v-tooltip eager bottom transition="fade-transition">
				<template v-slot:activator="{ on, attrs }">
					<v-icon
						class="titlebar--nodrag ml-4 mt-1 d-none d-md-flex"
						v-bind="attrs"
						v-on="on"
					>mdi-information-variant
					</v-icon>
				</template>
				<span>{{ $t("logs_count") }}: {{ logEntryCount }}</span>
				<map-t-s/>
				<br>
				<br>
				{{ $t("memory_usage") }}:<br>
				<span>{{ usedJSHeapSize }}/{{ totalJSHeapSize }} Mb front</span>
				<br>
				<span>{{ heapTotal }}/{{ heapUsed }}/{{ externalMem }} Mb back</span>
			</v-tooltip>

			<stats-server class="ml-4 mt-1 d-none d-md-flex"/>
			<auth-btn class="titlebar--nodrag ml-4 mr-1 d-flex"/>

			<div class="titlebar-controls titlebar--nodrag d-flex ml-1" v-if="isPlatformWindows">
				<button
					class="titlebar-button" title="Minimize"
					@click="minimizeWindow">
					<svg width="10" height="1" viewBox="0 0 10 1" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M0 0H10V1H0Z" fill="#D8DEE9"></path>
					</svg>
				</button>

				<button
					class="titlebar-button"
					v-if="isMaximized"
					@click="unMaximizeWindow"
				>
					<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M10 8 H8 V10 H0 V2 H2 V0 H10 V8 Z
											M1 3 V9 H7 V3 Z
                     M9 1 H3 V2 H8 V7 H9 V1 Z" fill="#D8DEE9"></path>
					</svg>
				</button>

				<button
					class="titlebar-button"
					v-if="!isMaximized"
					@click="maximizeWindow"
				>
					<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M0 0H10V10H0ZM1 1V9H9V1Z" fill="#D8DEE9"></path>
					</svg>
				</button>

				<button
					class="titlebar-button titlebar-button--close"
					@click="closeWindow"
				>
					<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M0.7 0L10 9.3L9.3 10L0 0.7ZM0 9.3L9.3 0L10 0.7L0.7 10Z" fill="#D8DEE9"></path>
					</svg>
				</button>
			</div>
		</v-row>
	</v-system-bar>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import events from "@/service/EventBus"
import {ipcRenderer} from "electron"
import JBBtn from "@/components/WindowChrome/JBBtn.vue"
import RegionsMenu from "@/components/WindowChrome/RegionsMenu.vue"
import AuthBtn from "@/components/WindowChrome/AuthBtn.vue"
import NoLogChannelsAlarm from "@/components/WindowChrome/NoLogChannelsAlarm.vue"
import StatsServer from "@/components/WindowChrome/StatsServer.vue"
import ZKBBtn from "@/components/WindowChrome/ZKBBtn.vue"
import Search from "@/components/WindowChrome/Search.vue"
import MapTS from "@/components/WindowChrome/MapTS.vue"
import ExtWinBtn from "@/components/WindowChrome/ExtWinBtn.vue"
import HistoryBtn from "@/components/WindowChrome/HistoryBtn.vue"
import TestBtn from "@/components/WindowChrome/TestBtn.vue"
import OverlayBtn from "@/components/WindowChrome/OverlayBtn.vue"
import FleetBtn from "@/components/WindowChrome/FleetBtn.vue"
import ShowLDBtn from "@/components/WindowChrome/ShowLDBtn.vue"
import settingsService from "@/service/settings"
import PathFinderBtn from "@/components/WindowChrome/PathFinderBtn.vue";
import logReader from "@/service/LogReader";

@Component({
	components: {PathFinderBtn, ShowLDBtn, FleetBtn, OverlayBtn, TestBtn, HistoryBtn, ExtWinBtn, MapTS, Search, ZKBBtn, StatsServer, NoLogChannelsAlarm, AuthBtn, RegionsMenu, JBBtn}
})
export default class WindowChrome extends Vue {
	usedJSHeapSize = 0
	totalJSHeapSize = 0
	heapTotal = 0
	heapUsed = 0
	externalMem = 0
	isFocus = true
	isMaximized = true

	isPlatformWindows = settingsService.platform === "win32"

	get showTopPanel(): boolean {
		return this.$store.getters.showTopPanel
	}

	get logEntryCount(): number {
		return logReader.logs.length
	}

	updateMemoryUsage() {
		// @ts-ignore
		const mem = window.performance.memory
		this.usedJSHeapSize = Math.round(mem.usedJSHeapSize / 1048576)
		this.totalJSHeapSize = Math.round(mem.totalJSHeapSize / 1048576)
	}

	updateBackMemoryUsage(event, mem) {
		this.heapTotal = Math.round(mem.heapTotal / 1048576)
		this.heapUsed = Math.round(mem.heapUsed / 1048576)
		this.externalMem = Math.round(mem.external / 1048576)
	}

	created() {
		events.$on("electron:app-menu:focus", this.focusHandler)
		events.$on("electron:app-menu:blur", this.blurHandler)
		events.$on("electron:app-menu:maximize", this.maximizeHandler)
		events.$on("electron:app-menu:unmaximize", this.unMaximizeHandler)

		events.$on("electron:memoryUsage", this.updateBackMemoryUsage)

		ipcRenderer.send("app-menu:isMaximized")
		this.updateMemoryUsage()
		setInterval(this.updateMemoryUsage.bind(this), 10000)
	}

	beforeDestroy() {
		events.$off("electron:app-menu:focus", this.focusHandler)
		events.$off("electron:app-menu:blur", this.blurHandler)
		events.$off("electron:app-menu:maximize", this.maximizeHandler)
		events.$off("electron:app-menu:unmaximize", this.unMaximizeHandler)
	}

	focusHandler() {
		this.isFocus = true
	}

	blurHandler() {
		this.isFocus = false
	}

	maximizeHandler() {
		this.isMaximized = true
	}

	unMaximizeHandler() {
		this.isMaximized = false
	}

	openMenu(event: PointerEvent) {
		event.preventDefault()
		ipcRenderer.send("app-menu:popup", {x: event.x, y: event.y});
	}

	minimizeWindow() {
		ipcRenderer.send("app-menu:minimize");
	}

	maximizeWindow() {
		ipcRenderer.send("app-menu:maximize");
	}

	unMaximizeWindow() {
		ipcRenderer.send("app-menu:unmaximize");
	}

	closeWindow() {
		ipcRenderer.send("app-menu:close");
	}
}
</script>

<style lang="scss">
.titlebar {
	-webkit-app-region: drag;
	color: #D8DEE9;
	box-shadow: 0 1px 0 0 rgba(216, 222, 233, 0.1);
	padding: 0;
	user-select: none;

	&-hamburger {
		height: 30px;
	}

	&-controls {
		height: 30px;
	}

	&--nodrag {
		-webkit-app-region: no-drag;
	}

	&-button {
		user-select: none;
		cursor: default;
		width: 44px;
		height: 100%;
		line-height: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: inherit;
		opacity: 0.8;
		border: inherit;
		outline: none;

		&:hover {
			background-color: rgba(255, 255, 255, 0.15);
			opacity: 1;
			transition: background-color 0.1s ease 0s;
		}

		&--close:hover {
			background-color: rgb(228, 20, 44);
		}
	}
}
</style>

<style lang="sass">
.theme--light .titlebar
	background-color: #3B4252

.theme--light
	.titlebar
		background-color: #3B4252

	.titlebar--blurred
		filter: contrast(.8) brightness(.8)

.theme--dark
	.titlebar
		background-color: #221F22

	.titlebar--blurred
		background-color: $background-main-dark
		box-shadow: none

</style>

<i18n>
{
	"en": {
		"memory_usage": "memory usage",
		"logs_count": "logs count"
	},
	"ru": {
		"memory_usage": "используется памяти",
		"logs_count": "объем логов"
	}
}
</i18n>
