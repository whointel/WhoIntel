<template>
	<div>
		<v-tooltip bottom transition="fade-transition">
			<template v-slot:activator="{on, attrs}">
				<v-chip
					@click="switchJBShow"
					v-on="on"
					v-bind="attrs"
					:loading="isLoading"
					:color="isShow ? 'green' : 'red'"
					x-small  outlined label
				>jb
				</v-chip>
			</template>
			<span class="text-caption">Jump bridges on map</span>
		</v-tooltip>
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
