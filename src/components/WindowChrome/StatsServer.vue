<template>
	<div class="caption">
		<span v-if="status">
			TQ: {{ online }}
		</span>
		<span v-else>
			offline
		</span>
	</div>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"

@Component
export default class StatsServer extends Vue {
	get status() {
		return this.$store.getters.EVEStatus
	}

	get online() {
		if (this.status && this.status.players) {
			return this.status.players.toLocaleString()
		}
		return "[unknown]"
	}
}
</script>
