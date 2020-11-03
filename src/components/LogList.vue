<template>
	<v-col cols="3" class="log-container" ref="logContainer">
		<div class="log-container__border"/>

		<v-footer inset padless tile v-if="filterSystem">
			<div class="ml-4 red--text">{{ filterSystem.name }}</div>
			<v-spacer/>
			<v-btn icon @click="filterSystem = null">
				<v-icon>mdi-close</v-icon>
			</v-btn>
		</v-footer>
		<v-list dense @click.native="linkClicked">
			<transition-group name="fade">
				<log-entry
					:entry="log"
					v-for="log in filteredLogs" :key="log.hash"
				/>
			</transition-group>
		</v-list>
	</v-col>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import LogEntry from "@/components/LogEntry.vue"
import events from "@/service/EventBus"
import logReader from "@/service/LogReader"
import {ILogEntry} from "@/types/ILogEntry"
import EVESystem from "@/lib/EVESystem"
import systemManager from "@/service/SystemManager"
import {ipcRenderer} from "electron"
import PerfectScrollbar from "perfect-scrollbar"

@Component({
	components: {LogEntry}
})
export default class LogList extends Vue {
	filterSystem: EVESystem | null = null
	ps: PerfectScrollbar | null = null

	$refs!: {
		messages: HTMLElement,
		logContainer: HTMLElement,
	}

	created() {
		events.$on("setLogFilterBySystem", this.applyLogFilter)
	}

	mounted() {
		this.ps = Object.preventExtensions(new PerfectScrollbar(this.$refs.logContainer, {wheelPropagation: false}))
	}

	linkClicked(event: Event) {
		const target = event.target as HTMLElement

		if (!event.target) return

		if (target.classList.contains("external-link")) {
			event.preventDefault()
			this.openLink(event)
			return
		}

		if (target.classList.contains("system_mark_pointer")) {
			if (
				!target.attributes["data-id"]
				|| !target.attributes["data-id"].value
				|| !target.attributes["data-id"].value.length
			) {
				return
			}

			const system_id = Number(target.attributes["data-id"].value)
			const system = systemManager.getSystemById(system_id)
			if (system) {
				systemManager.markSystem(system)
				event.preventDefault()
				return
			}
		}
	}

	openLink(event: Event) {
		const target = event.target as HTMLElement

		if (
			!event.target
			|| !target.classList.contains("external-link")
			|| !target.attributes["data-link"]
			|| !target.attributes["data-link"].value
			|| !target.attributes["data-link"].value.length
		) {
			return
		}

		const link = target.attributes["data-link"].value
		console.log("link clicked: ", link)
		ipcRenderer.send("openLink", link)
	}

	applyLogFilter(system: EVESystem) {
		this.filterSystem = system
	}

	get filteredLogs(): ILogEntry[] {
		if (!this.filterSystem) return logReader.logs

		return logReader.logs.filter(log => {
			if (this.filterSystem instanceof EVESystem) {
				return log.systems.includes(this.filterSystem)
			}

			return false
		})
	}
}
</script>

<style lang="scss" scoped>
.fade-enter-active {
	transition: opacity .5s, background-color 2s;
}

.fade-enter {
	opacity: 0;
	background-color: #F9DCDC;
}

.fade-enter-to {
	opacity: 1;
	background-color: white;
}
</style>

<style lang="scss">
.log-container {
	height: 100%;
	overflow-y: scroll;
	position: relative;
}

.log-container__border {
	position: absolute;
	left: 0;
	top: 0;
	height: 100%;
	width: 1px;
}
</style>

<style lang="sass">
@import "src/scss/theme"

+theme-glob(log-container__border) using($material)
	background-color: map-get($material, 'dividers')
</style>
