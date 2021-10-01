<template>
	<div>
		<v-tooltip bottom transition="fade-transition">
			<template v-slot:activator="{on, attrs}">
				<v-chip
					@click="switchZKB"
					v-on="on"
					v-bind="attrs"
					x-small :color="color" outlined label
				>zkb
				</v-chip>
			</template>
			<span class="text-caption">ZKillboard logs</span>
		</v-tooltip>
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
