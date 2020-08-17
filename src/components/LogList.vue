<template>
	<v-col cols="3" class="log-container">
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
// eslint-disable-next-line no-unused-vars
import {ILogEntry} from "@/types/ILogEntry"
// eslint-disable-next-line no-unused-vars
import EVESystem from "@/lib/EVESystem"
import systemManager from "@/service/SystemManager"
import {ipcRenderer} from "electron"

@Component({
	components: {LogEntry}
})
export default class LogList extends Vue {
	filterSystem: EVESystem | null = null

	$refs!: {
		messages: HTMLElement,
	}

	created() {
		events.$on("setLogFilterBySystem", this.applyLogFilter)
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
				systemManager.markSystem(system, true)
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

	get logs(): ILogEntry[] {
		return logReader.logs
	}

	get filteredLogs(): ILogEntry[] {
		if (!this.filterSystem) return this.logs

		return this.logs.filter(log => {
			if (this.filterSystem instanceof EVESystem) {
				return log.systems.includes(this.filterSystem)
			}

			return false
		})
	}
}
</script>

<style scoped>
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

.log-container {
	/*height: calc(100vh - 30px);*/
	height: 100%;
	overflow-y: scroll;
}
</style>
