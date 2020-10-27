<template>
	<v-progress-linear
		v-if="isActive"
		:indeterminate="isIndeterminate"
		:value="loaderPercent"
		absolute top
		color="orange accent-4"
	/>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"

@Component
export default class LoaderMain extends Vue {
	get isActive(): boolean {
		return this.isIndeterminate || (this.loaderPercent !== null)
	}

	get isIndeterminate(): boolean {
		return this.$store.getters.isLoading
	}

	get loaderPercent(): null | number {
		return this.$store.getters.loaderPercent
	}
}
</script>
