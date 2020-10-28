<template>
	<div v-if="showLikeDisLike">
		<v-icon @click="click" :color="color">mdi-comment-question-outline</v-icon>
	</div>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import events from "@/service/EventBus"

const colors = {
	false: "red lighten-2",
	true: "red lighten-4",
}

@Component
export default class ShowLDBtn extends Vue {
	showLikeDisLike = false
	timer: any = null

	colorVariant = false

	get color() {
		return colors[String(this.colorVariant)]
	}

	created() {
		events.$on("showLikeDisLike", () => {
			this.showLikeDisLike = true
			this.timer = setInterval(() => this.colorVariant = !this.colorVariant, 1_500)
		})
	}

	click() {
		events.$emit("showLikeDisLikeWindow")
		this.showLikeDisLike = false
		if (this.timer) clearTimeout(this.timer)
	}
}
</script>
