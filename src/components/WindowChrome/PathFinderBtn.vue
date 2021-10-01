<template>
	<div>
		<v-tooltip bottom transition="fade-transition">
			<template v-slot:activator="{on, attrs}">
				<v-chip
					@click="switchShow"
					v-on="on"
					v-bind="attrs"
					:color="isShow ? 'green' : 'red'"
					x-small outlined label
				>pf
				</v-chip>
			</template>
			<span class="text-caption">Path finder</span>
		</v-tooltip>
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
