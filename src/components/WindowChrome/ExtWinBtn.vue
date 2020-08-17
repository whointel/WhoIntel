<template>
	<div v-if="isShow">
		<v-chip
			x-small outlined color="grey" label
			@click="open"
		>ext
		</v-chip>
	</div>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import settingsService from "@/service/settings"
import {ipcRenderer} from "electron"

@Component
export default class ExtWinBtn extends Vue {
	get isShow() {
		return settingsService.$.externalURLs.length
	}

	open() {
		settingsService.$.externalURLs.forEach(url => ipcRenderer.send("openLink", url.url))
	}
}
</script>
