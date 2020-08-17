<template>
	<div>
		<v-chip
			x-small :color="color" outlined label
			@click="switchZKB"
		>zkb
		</v-chip>
	</div>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import zkillboard from "@/service/ZKillboard"
import settingsService from "@/service/settings"
import {ZKB_STATUS} from "@/types/ZKillboard"

@Component
export default class ZKBBtn extends Vue {
	get color() {
		switch (this.$store.getters.ZKBStatus as ZKB_STATUS) {
			case ZKB_STATUS.CONNECTED:
				return "green"
			case ZKB_STATUS.CONNECTING:
				return "yellow"
			case ZKB_STATUS.DISCONNECTED:
			default:
				return "red"
		}
	}

	switchZKB() {
		zkillboard.switchStatus(!settingsService.$.zkbEnable)
	}
}
</script>
