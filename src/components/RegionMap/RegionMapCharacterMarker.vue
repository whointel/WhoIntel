<template>
	<svg>
		<g v-for="marker in characterMarkers" :key="marker.name">
			<ellipse
				:cx="marker.cx" :cy="marker.cy"
				:rx="marker.rx" :ry="marker.ry"
				:fill="marker.color"
			/>
		</g>
	</svg>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import systemManager from "@/service/SystemManager"
import characterManager from "@/service/CharacterManager"
import Character from "@/lib/Character"

@Component
export default class RegionMapCharacterMarker extends Vue {
	get characterMarkers(): any[] {
		if (!systemManager.currentRegion) return []

		const systemsToCharacters = characterManager.regionSystemToChars[systemManager.currentRegion.id]

		if (!systemsToCharacters) return []

		let result: any[] = []

		for (const [, characters] of Object.entries(systemsToCharacters)) {
			characters.forEach(character => {
				const system = (character as Character).location

				if (!system || !system.mapCoordinates) {
					return
				}

				result.push({
					cx: system.mapCoordinates.center_x - 2.5,
					cy: system.mapCoordinates.center_y,
					rx: (system.mapCoordinates.width / 2) + 4,
					ry: (system.mapCoordinates.height / 2) + 4,
					color: character.name === characterManager.activeCharacter?.name ? "#8B008D" : "#FB00FF",
					name: character.name
				})
			})
		}

		return result
	}
}
</script>
