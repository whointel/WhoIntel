<template>
	<v-tooltip bottom transition="fade-transition">
		<template v-slot:activator="{ on, attrs }">
			<v-btn icon v-bind="attrs" v-on="on" @click="copyPath">
				<v-icon small>{{ copyIcon }}</v-icon>
			</v-btn>
		</template>
		<span>Скопировать путь в буфер обмена</span>
	</v-tooltip>
</template>

<script lang="ts">
import {Component, Vue, Prop} from "vue-property-decorator"
import Timeout from "await-timeout"
import {IPATHPOINT} from "@/types/PathFinder";

@Component
export default class PathFinderCopyBtn extends Vue {
	@Prop({
		required: true,
		type: Object,
	}) pathPoints!: IPATHPOINT

	showCopied = false

	get copyIcon() {
		return this.showCopied ? "mdi-check-bold" : "mdi-content-copy"
	}

	get pathString(): string {
		let path = ""
		for (let i = 0; i < this.pathPoints.path.length; i++) {
			const pathPoint = this.pathPoints.path[i]
			const isLastPathPoint = i >= (this.pathPoints.path.length - 1)

			path = path + `${pathPoint.system.name} (${pathPoint.system.region.name})`
			if (!isLastPathPoint) {
				path = path + " " + (pathPoint.jb ? "»" : "-") + " "
			}
		}

		return path
	}

	async copyPath() {
		this.showCopied = true

		await navigator.clipboard.writeText(this.pathString)
		await Timeout.set(1000)
		this.showCopied = false
	}
}
</script>
