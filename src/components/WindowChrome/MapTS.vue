<template>
	<span v-if="time"><br>кэш карты региона: {{ time }}</span>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import formatDistanceToNow from "date-fns/formatDistanceToNow"
import systemManager from "@/service/SystemManager"

@Component
export default class MapTS extends Vue {
	updateInterval: any = null

	get time() {
		const ts = systemManager.currentRegion?.tsUpdate
		return ts ? formatDistanceToNow(ts) : null
	}

	mounted() {
		this.updateInterval = setInterval(() => this.$forceUpdate(), 60_000)
	}

	beforeDestroy() {
		if (this.updateInterval) clearInterval(this.updateInterval)
	}
}
</script>
