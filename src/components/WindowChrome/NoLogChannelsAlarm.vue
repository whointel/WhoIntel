<template>
	<div v-if="noSecureChannels">
		<v-tooltip bottom>
			<template v-slot:activator="{ on, attrs }">
				<v-icon
					right
					@click="openSettings"
					color="red"
					v-bind="attrs"
					v-on="on"
				>
					mdi-map-marker-path
				</v-icon>

			</template>
			<span>No Secure channels for watching</span>
		</v-tooltip>
	</div>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import settingsService from "@/service/settings"
import events from "@/service/EventBus";

@Component
export default class NoLogChannelsAlarm extends Vue {
	get noSecureChannels() {
		return !settingsService.$.logChannels.length
	}

	openSettings() {
		events.$emit("open:config:channels")
	}
}
</script>
