<template>
	<v-progress-linear
		v-if="isActive"
		indeterminate
		absolute top
		color="orange accent-4"
	/>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"

@Component
export default class LoaderMain extends Vue {
	get isActive() {
		return this.$store.getters.isLoading
	}
}
</script>
