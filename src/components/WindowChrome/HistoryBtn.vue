<template>
	<div>
		<v-icon
			@click="back"
			:disabled="!isBack"
		>mdi-arrow-left
		</v-icon>
		<v-icon
			@click="forward"
			:disabled="!isForward"
		>mdi-arrow-right
		</v-icon>
	</div>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import historyService from "@/service/HistoryService"

@Component
export default class HistoryBtn extends Vue {
	get isBack() {
		return historyService.regionHistoryShift < historyService.regionHistory.length - 1
	}

	get isForward() {
		return historyService.regionHistoryShift > 0
	}

	back() {
		historyService.historyBack()
	}

	forward() {
		historyService.historyForward()
	}
}
</script>
