<template>
	<div>
		<v-chip
			x-small outlined label color="yellow"
			@click="test"
		>test
		</v-chip>
	</div>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"

@Component
export default class TestBtn extends Vue {
	test() {

	}
}
</script>
