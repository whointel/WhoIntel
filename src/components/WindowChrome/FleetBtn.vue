<template>
	<div v-if="settings.showFleetBtn">
		<v-chip
			x-small :color="isShow ? 'green' : 'blue'" outlined label
			@click="switchShow"
		>fleet
		</v-chip>
	</div>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import settingsService from "@/service/settings"

@Component
export default class FleetBtn extends Vue {
	get isShow() {
		return this.$store.getters.showFleetPanel
	}

	get settings() {
		return settingsService.$
	}

	async switchShow() {
		await this.$store.commit("setShowFleetPanel", !this.isShow)
	}
}
</script>
