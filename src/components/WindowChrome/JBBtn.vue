<template>
	<div>
		<v-chip
			x-small :color="isShow ? 'green' : 'red'" outlined label
			@click="switchJBShow"
			:loading="isLoading"
		>jb
		</v-chip>
	</div>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"

@Component
export default class JBBtn extends Vue {
	get isShow() {
		return this.$store.getters.isJBShow
	}

	isLoading = false

	async switchJBShow() {
		this.isLoading = true
		await this.$store.dispatch("setJBShow", !this.isShow)
		this.isLoading = false
	}
}
</script>
