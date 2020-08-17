<template>
	<v-snackbar
		v-model="snackbar"
		color="red"
		app top centered dark
		:timeout="-1"
	>
		{{ alert }}

		<template v-slot:action="{ attrs }">
			<v-icon
				v-bind="attrs"
				@click="close"
				color="white"
			>mdi-close
			</v-icon>
		</template>
	</v-snackbar>
</template>

<script lang="ts">
import {Component, Vue, Watch} from "vue-property-decorator"

@Component
export default class ApiPopup extends Vue {
	snackbar = false

	get alert() {
		return this.$store.getters.error
	}

	@Watch("$store.getters.error")
	errorWatcher(val: string) {
		if (val && val.length) {
			this.snackbar = true
		}
	}

	close() {
		this.snackbar = false
		this.$store.commit("setError", "")
	}
}
</script>
