<template>
	<g
		v-if="selectSystemMarker.visible"
		:transform="`translate(${selectSystemMarker.x}, ${selectSystemMarker.y})`"
		id="system-marker"
	>
		<ellipse cx="0" cy="0" rx="56" ry="28" fill="#462CFF"></ellipse>
		<line x1="0" y1="-10000" x2="0" y2="0" stroke="#462CFF"></line>
		<line x1="-10000" y1="0" x2="0" y2="0" stroke="#462CFF"></line>
		<line x1="10000" y1="0" x2="0" y2="0" stroke="#462CFF"></line>
		<line x1="0" y1="10000" x2="0" y2="0" stroke="#462CFF"></line>
	</g>
</template>

<script lang="ts">
import {Component, Vue, Watch} from "vue-property-decorator"
import systemManager from "@/service/SystemManager"
import EVESystem from "@/lib/EVESystem"
import {of, Subscription} from "rxjs"
import {delay} from "rxjs/operators"

@Component
export default class RegionMapSystemMarker extends Vue {
	markSystem$: Subscription = new Subscription()

	get markedSystem(): EVESystem | null {
		return systemManager.markedSystem as EVESystem
	}

	// fix for re-mark same system - css animation doesn't see change
	canShowMarkedSystem = false

	get selectSystemMarker(): {
		x: number
		y: number
		visible: boolean
	} {
		if (
			!this.markedSystem
			|| !this.markedSystem.mapCoordinates
			// предполагаем что все соседствующие системы есть на карте
			// || this.markedSystem.region_id !== systemManager.currentRegion?.id
		) {
			return {
				x: 0,
				y: 0,
				visible: false,
			}
		}

		const x = this.markedSystem.mapCoordinates.center_x
		const y = this.markedSystem.mapCoordinates.center_y + 1

		return {
			x, y,
			visible: this.canShowMarkedSystem,
		}
	}

	@Watch("markedSystem")
	markSystem(system: EVESystem | null) {
		this.markSystem$.unsubscribe()
		this.canShowMarkedSystem = false

		if (!system) {
			return
		}

		// see definition for this.canShowMarkedSystem
		this.$nextTick(() => this.canShowMarkedSystem = true)

		this.markSystem$ = of([]).pipe(
			delay(10_000 /* same value as fadeOutSystemMarker animation css*/),
		).subscribe({complete: () => systemManager.unMarkSystem("markSystem delay")})
	}
}
</script>

<style lang="scss">
@keyframes fadeOutSystemMarker {
	0% {
		opacity: 1;
	}
	100% {
		opacity: 0;
	}
}

#system-marker {
	animation: fadeOutSystemMarker 10s forwards ease-in;
}
</style>
