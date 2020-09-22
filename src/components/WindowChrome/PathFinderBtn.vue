<template>
	<div>
		<v-chip
			x-small :color="isShow ? 'green' : 'red'" outlined label
			@click="switchShow"
		>pf
		</v-chip>
	</div>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"

@Component
export default class PathFinderBtn extends Vue {
	get isShow() {
		return this.$store.getters.showPathPanel
	}

	async switchShow() {
		this.$store.commit("setShowPathPanel", !this.isShow)
	}
}
</script>
