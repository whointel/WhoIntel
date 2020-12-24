<template>
	<v-menu
		offset-y
		absolute
		dense
		:position-x="options.x"
		:position-y="options.y"
		:close-on-content-click="false"
		:transition="false"
		v-model="show"
	>
		<v-list dense>
			<v-list-item @click="apiSetDestination" :disabled="!isAuthed">
				<v-list-item-icon>
					<v-icon>mdi-transfer-right</v-icon>
				</v-list-item-icon>
				<v-list-item-content>
					<v-list-item-title>
						Set Destination
					</v-list-item-title>
					<v-list-item-subtitle class="red--text text--lighten-3" v-if="!isAuthed">
						Вы не авторизованы
					</v-list-item-subtitle>
				</v-list-item-content>
			</v-list-item>
			<v-list-item @click="apiAddWaypoint" :disabled="!isAuthed">
				<v-list-item-icon>
					<v-icon>mdi-transfer-right</v-icon>
				</v-list-item-icon>
				<v-list-item-content>
					<v-list-item-title>
						Add Waypoint
					</v-list-item-title>
					<v-list-item-subtitle class="red--text text--lighten-3" v-if="!isAuthed">
						Вы не авторизованы
					</v-list-item-subtitle>
				</v-list-item-content>
			</v-list-item>

			<v-menu
				offset-x
				dense
				:transition="false"
				open-on-hover
			>
				<template v-slot:activator="{ on, attrs }">
					<v-list-item
						v-bind="attrs"
						v-on="on"
					>
						<v-list-item-icon>
							<v-icon>mdi-transfer-right</v-icon>
						</v-list-item-icon>
						<v-list-item-content>
							<v-list-item-title>
								{{ $t("find_path") }}
							</v-list-item-title>
						</v-list-item-content>
						<v-list-item-action>
							<v-icon color="grey lighten-1">mdi-chevron-right</v-icon>
						</v-list-item-action>
					</v-list-item>
				</template>

				<v-list dense>
					<v-list-item
						:disabled="isPathFinderSystemExcluded"
						@click="pathFinderSetStartEnd"
					>
						<v-list-item-icon>
							<v-icon>mdi-arrow-left-right</v-icon>
						</v-list-item-icon>
						<v-list-item-content>
							<v-list-item-title>
								{{ $t("find_path_from_current_to") }}
							</v-list-item-title>
						</v-list-item-content>
					</v-list-item>

					<v-list-item
						:disabled="isPathFinderSystemExcluded"
						@click="pathFinderSetEnd"
					>
						<v-list-item-icon>
							<v-icon>mdi-arrow-bottom-right</v-icon>
						</v-list-item-icon>
						<v-list-item-content>
							<v-list-item-title>
								{{ $t("find_path_to") }}
							</v-list-item-title>
						</v-list-item-content>
					</v-list-item>

					<v-list-item
						:disabled="isPathFinderSystemExcluded"
						@click="pathFinderSetStart"
					>
						<v-list-item-icon>
							<v-icon>mdi-arrow-top-right</v-icon>
						</v-list-item-icon>
						<v-list-item-content>
							<v-list-item-title>
								{{ $t("find_path_from") }}
							</v-list-item-title>
						</v-list-item-content>
					</v-list-item>

					<v-list-item
						:disabled="isPathFinderSystemMiddle || isPathFinderSystemExcluded"
						@click="pathFinderSetMiddle"
					>
						<v-list-item-icon>
							<v-icon>mdi-arrow-left-right</v-icon>
						</v-list-item-icon>
						<v-list-item-content>
							<v-list-item-title>
								<v-icon v-if="isPathFinderSystemMiddle" color="green">mdi-check</v-icon>
								Пройти через систему
							</v-list-item-title>
						</v-list-item-content>
					</v-list-item>

					<v-list-item
						:disabled="isPathFinderSystemMiddle || isPathFinderSystemExcluded"
						@click="pathFinderAddExclude"
					>
						<v-list-item-icon>
							<v-icon>mdi-close-octagon-outline</v-icon>
						</v-list-item-icon>
						<v-list-item-content>
							<v-list-item-title>
								<v-icon v-if="isPathFinderSystemExcluded" color="green">mdi-check</v-icon>
								Исключить систему
							</v-list-item-title>
						</v-list-item-content>
					</v-list-item>
				</v-list>
			</v-menu>

			<v-divider/>

			<v-menu
				offset-x
				dense
				:transition="false"
				open-on-hover
				v-if="charactersInSystem.length || charactersNotInSystem.length"
			>
				<template v-slot:activator="{ on, attrs }">
					<v-list-item
						v-bind="attrs"
						v-on="on"
					>
						<v-list-item-icon>
							<v-icon>mdi-account</v-icon>
						</v-list-item-icon>
						<v-list-item-content>
							<v-list-item-title>
								{{ $t("character_list") }}
							</v-list-item-title>
						</v-list-item-content>
						<v-list-item-action>
							<v-icon color="grey lighten-1">mdi-chevron-right</v-icon>
						</v-list-item-action>
					</v-list-item>
				</template>

				<v-list dense>
					<v-list-item
						v-for="character in charactersNotInSystem" :key="character.name"
						@click="setSystemAsCurrentForCharacter(character)"
					>
						<v-list-item-icon>
							<v-icon>mdi-arrow-bottom-right-bold-outline</v-icon>
						</v-list-item-icon>
						<v-list-item-content>
							<v-list-item-title>
								{{ $t("set_system_as_current_for_character", {name: character.name}) }}
							</v-list-item-title>
						</v-list-item-content>
					</v-list-item>

					<v-list-item
						disabled
						v-for="character in charactersInSystem" :key="character.name"
					>
						<v-list-item-icon>
							<v-icon>mdi-account</v-icon>
						</v-list-item-icon>
						<v-list-item-content>
							<v-list-item-title>
								{{ character.name }}
							</v-list-item-title>
						</v-list-item-content>
					</v-list-item>
				</v-list>
			</v-menu>

			<v-list-item @click="applyLogFilter">
				<v-list-item-icon>
					<v-icon>mdi-map-marker-path</v-icon>
				</v-list-item-icon>
				<v-list-item-content>
					<v-list-item-title>
						{{ $t("show_system_log") }}
					</v-list-item-title>
				</v-list-item-content>
			</v-list-item>

			<v-list-item v-if="neighbourRegion" @click="goToNeighbourRegion">
				<v-list-item-icon>
					<v-icon>mdi-map-marker-path</v-icon>
				</v-list-item-icon>
				<v-list-item-content>
					<v-list-item-title>
						{{ $t("adjacent") }}: {{ $t("region") }} "{{ neighbourRegion.name }}"
					</v-list-item-title>
				</v-list-item-content>
			</v-list-item>

			<v-list-item
				@click="goToJBNeighbourRegion(record.jb)"
				v-for="record in neighbourRegionsThroughJB"
				:key="record.jb.structure_id"
			>
				<v-list-item-icon>
					<v-icon>mdi-map-marker-path</v-icon>
				</v-list-item-icon>
				<v-list-item-content>
					<v-list-item-title>
						JB: {{ $t("region") }} "{{ record.region.name }}" / {{ record.jb.systemTo.name }}
					</v-list-item-title>
				</v-list-item-content>
			</v-list-item>

			<v-divider/>

			<v-list-item @click="goZKB">
				<v-list-item-content>
					<v-list-item-title>
						ZKillboard
					</v-list-item-title>
				</v-list-item-content>
			</v-list-item>

			<v-divider/>

			<v-list-item v-if="system && !isDevServer" disabled>
				<v-list-item-content>
					<v-list-item-title>
						{{ menuSystemStat }}
						<span v-if="pathJumps">
							/ {{ pathJumps }} {{ $tc("jumps", pathJumps) }}
						</span>
					</v-list-item-title>
				</v-list-item-content>
			</v-list-item>

			<v-menu
				offset-x
				dense
				:transition="false"
				open-on-hover
				:close-on-content-click="false"
				v-if="system && isDevServer"
			>
				<template v-slot:activator="{ on, attrs }">
					<v-list-item
						v-bind="attrs"
						v-on="on"
					>
						<v-list-item-content>
							<v-list-item-title>
								{{ menuSystemStat }}
								<span v-if="pathJumps">
								/ {{ pathJumps }} {{ $tc("jumps", pathJumps) }}
							</span>
							</v-list-item-title>
						</v-list-item-content>
						<v-list-item-action>
							<v-icon color="grey lighten-1">mdi-chevron-right</v-icon>
						</v-list-item-action>
					</v-list-item>
				</template>

				<v-list dense>
					<v-list-item>
						<v-list-item-content>
							<v-list-item-title>
								{{ system.nameDebug }}
								<br>
								{{ system.region.nameDebug }}
								<br>
								<div v-for="(jb, index) in jbDebug" :key="index">
									{{ jb }}
									<br>
								</div>
							</v-list-item-title>
						</v-list-item-content>
					</v-list-item>
				</v-list>
			</v-menu>

		</v-list>
	</v-menu>
</template>

<script lang="ts">
import {Component, Vue, Prop, Watch} from "vue-property-decorator"
import EVESystem from "@/lib/EVESystem"
import systemManager from "@/service/SystemManager"
import {CONTEXT_MENU} from "@/types/RegionMap"
import events from "@/service/EventBus"
import EVEJumpBridge from "@/lib/EVEJumpBridge"
import {ipcRenderer} from "electron"
import characterManager from "@/service/CharacterManager"
import pathService from "@/service/PathService"
import Character from "@/lib/Character"
import EVERegion from "@/lib/EVERegion"

@Component
export default class RegionMapContextMenu extends Vue {
	@Prop() options!: CONTEXT_MENU
	@Prop() value!: boolean

	show: boolean = false

	@Watch("show")
	showWatcher(show) {
		this.$emit("input", show)
	}

	@Watch("value")
	valueWatcher(show) {
		this.show = show
	}

	isDevServer = process.env.NODE_ENV !== "production"

	get currentRegion() {
		return systemManager.currentRegion
	}

	@Watch("currentRegion", {immediate: false})
	onChangeCurrentRegion() {
		this.show = false
	}

	beforeDestroy() {
		this.showWatcher(false)
	}

	get charactersInSystem(): Character[] {
		if (!this.system) return []

		return Object.values(characterManager.characters)
			.filter(character => this.system && character.location && (character.location.id === this.system.id)) as Character[]
	}

	get charactersNotInSystem(): Character[] {
		if (!this.system) return []

		return Object.values(characterManager.characters)
			.filter(character => !this.system || !character.location || (character.location.id !== this.system.id)) as Character[]
	}

	getCurrentSystemForAPICharacter() {
		return characterManager.activeCharacter?.auth.isAuthed ? characterManager.getCurrentSystem() : null
	}

	get jbDebug() {
		let jbs = systemManager.jbBySystemId[this.system!.id]
		if (!jbs) {
			return []
		}

		let result: any[] = []
		for (const jb_id in jbs) {
			result.push(jbs[jb_id].nameDebug)
		}

		return result
	}

	get pathJumps(): number {
		if (!this.system) return 0

		const currentSystem = this.getCurrentSystemForAPICharacter()
		if (!currentSystem) return 0

		return pathService.find(currentSystem.id, this.system.id).length
	}

	pathFinderSetStart() {
		this.closeMenu()
		if (!this.system) return

		pathService.setStart(this.system.id)
	}

	pathFinderSetMiddle() {
		this.closeMenu()
		if (!this.system) return

		pathService.addMiddle(this.system)
	}

	pathFinderSetStartEnd() {
		this.closeMenu()
		if (!this.system) return

		pathService.setEnd(this.system.id)
		pathService.setStartFromCurrentSystem()
	}

	pathFinderSetEnd() {
		this.closeMenu()
		if (!this.system) return

		pathService.setEnd(this.system.id)
		if (!pathService.pathPoints.start) {
			pathService.setStartFromCurrentSystem()
		}
	}

	pathFinderAddExclude() {
		this.closeMenu()
		if (!this.system) return

		pathService.addExclude(this.system)
	}

	get isPathFinderSystemExcluded(): boolean {
		if (!this.system) return false

		return pathService.pathPoints.exclude.includes(this.system)
	}

	get isPathFinderSystemMiddle(): boolean {
		if (!this.system) return false

		return pathService.pathPoints.middle.includes(this.system)
	}

	setMarker(system: EVESystem) {
		systemManager.markSystem(system)
	}

	get neighbourRegion(): EVERegion | null {
		if (!this.system) return null
		if (this.system.region_id === systemManager.currentRegion?.id) return null

		return systemManager.regions[this.system.region_id] as EVERegion
	}

	goToNeighbourRegion() {
		this.closeMenu()
		if (!this.system || !this.neighbourRegion) return

		systemManager.markSystem(this.system, true)
	}

	goToJBNeighbourRegion(jb: EVEJumpBridge) {
		this.closeMenu()

		systemManager.markSystem(jb.systemTo!, true)
	}

	get JBs(): EVEJumpBridge[] {
		if (!this.system) return []

		const jbs = systemManager.jbBySystemId[this.system.id]

		if (!jbs) return []

		const result = Object.values(jbs)

		return result as unknown as EVEJumpBridge[]
	}

	get neighbourRegionsThroughJB(): { jb: EVEJumpBridge, region: EVERegion }[] {
		return this.JBs
			.filter(jb => jb.systemTo!.region_id !== systemManager.currentRegion?.id)
			.map(jb => {
				return {
					jb,
					region: systemManager.regions[jb.systemTo!.region_id] as EVERegion
				}
			})
	}

	get isAuthed(): boolean {
		return characterManager.activeCharacter?.auth.isAuthed || false
	}

	get system(): EVESystem | null {
		return systemManager.getSystemById(this.options.system_id)
	}

	async apiSetDestination() {
		this.closeMenu()
		if (!this.system) return

		try {
			await characterManager.activeCharacter?.setWaypoint(
				this.options.system_id,
				true, false
			)
			// eslint-disable-next-line no-empty
		} catch (e) {
		}
	}

	async apiAddWaypoint() {
		this.closeMenu()
		if (!this.system) return

		try {
			await characterManager.activeCharacter?.setWaypoint(
				this.options.system_id,
				false, false
			)
			// eslint-disable-next-line no-empty
		} catch (e) {
		}
	}

	closeMenu() {
		this.show = false
	}

	applyLogFilter() {
		this.closeMenu()
		events.$emit("setLogFilterBySystem", this.system)
	}

	get activeCharacter(): Character | null {
		return characterManager.activeCharacter as Character
	}

	setSystemAsCurrentForCharacter(character: Character) {
		this.closeMenu()
		if (!this.system) return

		characterManager.setLocation(character.name, this.system)
	}

	get menuSystemStat() {
		return this.system?.name

		// if (!this.system) {
		// 	return ""
		// }
		//
		// return `
		// 	${this.system.name},
		// 	jumps: ${this.system.jumps},
		// 	npc_kills: ${this.system.kills.npc},
		// 	pod_kills: ${this.system.kills.pod},
		// 	ship_kills: ${this.system.kills.ship}
		// `
	}

	goZKB() {
		if (!this.system) return

		this.closeMenu()
		ipcRenderer.send("openLink", `https://zkillboard.com/system/${this.system.id}/`)
	}

}
</script>

<i18n>
{
	"en": {
		"find_path": "Find path",
		"find_path_from": "From",
		"find_path_to": "To",
		"find_path_from_current_to": "To (from current)",
		"jumps": "jumps|jump|jumps",
		"no_auth": "No authorization",
		"show_system_log": "Show system log",
		"set_system_as_current_for_character": "Set as current for \"{name}\"",
		"region": "region",
		"adjacent": "Adj",
		"character_list": "Characters"
	},
	"ru": {
		"find_path": "Построить маршрут",
		"find_path_from": "Откуда",
		"find_path_to": "Куда",
		"find_path_from_current_to": "Куда (из текущего)",
		"jumps": "прыжков|прыжок|прыжка|прыжков|прыжков",
		"no_auth": "Вы не авторизованы",
		"show_system_log": "Лог системы",
		"set_system_as_current_for_character": "Установить текущей для \"{name}\"",
		"region": "регион",
		"adjacent": "Соседний",
		"character_list": "Персонажи"
	}
}
</i18n>
