<template>
	<span v-if="ts"><br>кэш карты региона: {{ time }}</span>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import events from "@/service/EventBus"
import formatDistanceToNow from "date-fns/formatDistanceToNow"
// eslint-disable-next-line no-unused-vars
import {IRegionMapExport} from "@/service/Database"

@Component
export default class MapTS extends Vue {
	ts: Date | null = null

	get time() {
		return this.ts ? formatDistanceToNow(this.ts) : ""
	}

	setMap(map: IRegionMapExport) {
		this.ts = map.ts
	}

	mounted() {
		events.$on("setRegionMap", this.setMap)
		setInterval(() => this.$forceUpdate(), 60000)
	}
}
</script>
