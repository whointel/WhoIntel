<template>
	<div>
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
				<v-list-item @click="apiSetDestination" :disabled="!isAPIAuthed">
					<v-list-item-icon>
						<v-icon>mdi-transfer-right</v-icon>
					</v-list-item-icon>
					<v-list-item-content>
						<v-list-item-title>
							Set Destination
						</v-list-item-title>
					</v-list-item-content>
				</v-list-item>
				<v-list-item @click="apiAddWaypoint" :disabled="!isAPIAuthed">
					<v-list-item-icon>
						<v-icon>mdi-transfer-right</v-icon>
					</v-list-item-icon>
					<v-list-item-content>
						<v-list-item-title>
							Add Waypoint
						</v-list-item-title>
					</v-list-item-content>
				</v-list-item>

				<v-list-item
					@click="apiAddWaypointJB"
					v-if="jb"
					:disabled="!isAPIAuthed || !jb.structure_id">
					<v-list-item-icon>
						<v-icon>mdi-transfer-right</v-icon>
					</v-list-item-icon>
					<v-list-item-content>
						<v-list-item-title>
							Add Waypoint to <b>JB</b> {{ jb.systemTo.name }}
						</v-list-item-title>
						<v-list-item-subtitle>
							{{ jb.name }} <b v-if="jbToNeighbourRegion">/ {{ jbToNeighbourRegion.name }}</b>
						</v-list-item-subtitle>
					</v-list-item-content>
				</v-list-item>

				<v-divider/>

				<v-list-item
					@click="apiSetDestinationPath"
					:disabled="!isAPIAuthed || !getCurrentSystemForAPICharacter() || !pathHopes().length">
					<v-list-item-icon>
						<v-icon>mdi-transfer-right</v-icon>
					</v-list-item-icon>
					<v-list-item-content>
						<v-list-item-title>
							Found Path
						</v-list-item-title>

						<v-list-item-subtitle v-if="!getCurrentSystemForAPICharacter()">
							No current system
						</v-list-item-subtitle>
						<v-list-item-subtitle v-else-if="pathHopes().length">
							{{ pathHopes().length }} hops
						</v-list-item-subtitle>

					</v-list-item-content>
				</v-list-item>
				<v-divider/>

				<v-list-item @click="applyLogFilter">
					<v-list-item-icon>
						<v-icon>mdi-map-marker-path</v-icon>
					</v-list-item-icon>
					<v-list-item-content>
						<v-list-item-title>
							Лог системы
						</v-list-item-title>
					</v-list-item-content>
				</v-list-item>

				<v-menu
					offset-x
					dense
					:transition="false"
					open-on-hover
					v-if="charactersInSystem.length || canSystemBeSetAsCurrent"
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
									Персонажи
								</v-list-item-title>
							</v-list-item-content>
							<v-list-item-action>
								<v-icon color="grey lighten-1">mdi-chevron-right</v-icon>
							</v-list-item-action>
						</v-list-item>
					</template>

					<v-list dense>
						<v-list-item @click="setSystemAsCurrent" v-if="canSystemBeSetAsCurrent">
							<v-list-item-icon>
								<v-icon>mdi-arrow-bottom-right-bold-outline</v-icon>
							</v-list-item-icon>
							<v-list-item-content>
								<v-list-item-title>
									Установить текущей для "{{ activeCharacter.name }}"
								</v-list-item-title>
							</v-list-item-content>
						</v-list-item>

						<v-list-item disabled v-for="character in charactersInSystem" :key="character">
							<v-list-item-icon>
								<v-icon>mdi-account</v-icon>
							</v-list-item-icon>
							<v-list-item-content>
								<v-list-item-title>
									{{ character }}
								</v-list-item-title>
							</v-list-item-content>
						</v-list-item>
					</v-list>
				</v-menu>

				<v-list-item v-if="neighbourRegion" @click="goToNeighbourRegion">
					<v-list-item-icon>
						<v-icon>mdi-map-marker-path</v-icon>
					</v-list-item-icon>
					<v-list-item-content>
						<v-list-item-title>
							Регион "{{ neighbourRegion.name }}" / соседний
						</v-list-item-title>
					</v-list-item-content>
				</v-list-item>

				<v-list-item
					@click="goToJBNeighbourRegion"
					v-if="jbToNeighbourRegion"
				>
					<v-list-item-icon>
						<v-icon>mdi-map-marker-path</v-icon>
					</v-list-item-icon>
					<v-list-item-content>
						<v-list-item-title>
							Регион "{{ jbToNeighbourRegion.name }}" / jb
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

				<v-list-item v-if="system" disabled>
					<v-list-item-content>
						<v-list-item-title>
							{{ menuSystemStat }}
						</v-list-item-title>
					</v-list-item-content>
				</v-list-item>
			</v-list>
		</v-menu>
	</div>
</template>

<script lang="ts">
import {Component, Vue, Prop, Watch} from "vue-property-decorator"
import api from "@/lib/EVEApi"
// eslint-disable-next-line no-unused-vars
import EVESystem from "@/lib/EVESystem"
import systemManager from "@/service/SystemManager"
// eslint-disable-next-line no-unused-vars
import {I_CONTEXT_MENU, IREGION} from "@/types/MAP"
import events from "@/service/EventBus"
import EVEJumpBride from "@/lib/EVEJumpBride"
import {aStar} from "ngraph.path"
import createGraph from "ngraph.graph"
import find from "lodash/find"
import {IPATHPOINT} from "@/types/PathFinder"
import {ipcRenderer} from "electron"
import characterManager, {ICharacterManagerCharacter} from "@/service/CharacterManager"

@Component
export default class RegionMapContextMenu extends Vue {
	@Prop() options!: I_CONTEXT_MENU
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

	mounted() {
		events.$on("setRegionMap", () => {
			this.show = false
		})
	}

	get charactersInSystem(): string[] {
		if (!this.system) return []
		const characterNameSet = characterManager.regionSystemToChars[this.system.region_id]?.[this.system.id] || new Set()
		return Array.from(characterNameSet)
	}

	getCurrentSystemForAPICharacter() {
		return characterManager.activeCharacter?.isAuthed ? characterManager.getCurrentSystem() : null
	}

	get canSystemBeSetAsCurrent(): boolean {
		if (!characterManager.activeCharacter) return false
		return characterManager.getCurrentSystem()?.id !== this.system?.id
	}

	pathHopes(): any[] {
		if (!this.system || !this.getCurrentSystemForAPICharacter()) return []

		// console.time("graph")

		let graph = createGraph()

		for (const systemId in systemManager.systemsById) {
			graph.addNode(systemId)
		}

		for (const systemId in systemManager.systemsById) {
			const system = systemManager.systemsById[systemId]
			system.neighbours.forEach(neighbour => graph.addLink(system.id, neighbour.id))
		}

		for (const jb of systemManager.jb) {
			if (
				!jb.systemFromId
				|| !jb.systemToId
			) continue

			graph.addLink(jb.systemFromId, jb.systemToId)
		}

		// console.timeEnd("graph")
		// console.time("path")

		let pathFinder = aStar(graph, {
			oriented: true,
		})
		const currentSystem = this.getCurrentSystemForAPICharacter()

		if (!currentSystem) return []

		let path = pathFinder.find(
			currentSystem.id,
			this.system.id,
		)
		// console.timeEnd("path")

		let pathResult = path.reverse()
		pathResult.shift()

		return pathResult.map(node => node.id)
	}

	apiSetDestinationPath() {
		this.closeMenu()

		const pathIds = this.pathHopes()
		let currentSystem = this.getCurrentSystemForAPICharacter()
		if (!pathIds.length || !currentSystem) return

		// const debugSystems = {}
		// pathIds.forEach(id => {
		// 	debugSystems[id] = systemManager.systemsById[id].name
		// })
		// console.table(debugSystems)

		const pathPoints: IPATHPOINT = {
			path: [],
			structures: [],
		}

		for (const id of pathIds) {
			let next = find(currentSystem!.neighbours, {id: id})
			if (next) {

				// console.debug(`${currentSystem?.name} / D / ${next?.name}`)
				pathPoints.path.push({
					system: currentSystem!,
				})
				currentSystem = next
				continue
			}

			const jb = systemManager.jbBySystemId[currentSystem!.id]
			if (
				!jb
				|| jb.systemTo?.id !== id
			) throw "path found error"

			next = jb.systemTo
			if (!next) throw "path found error"

			pathPoints.structures.push(jb.structure_id)

			// console.debug(`${currentSystem?.name} / ${jb?.name} / ${next?.name}`)
			pathPoints.path.push({
				system: currentSystem!,
				jb: jb,
			})
			currentSystem = next
		}

		pathPoints.path.push({
			system: currentSystem!,
		})

		pathPoints.structures.push(currentSystem!.id)
		// console.debug(pathPoints.structures)

		events.$emit("setPathPoints", pathPoints)
	}

	setMarker(system: EVESystem) {
		systemManager.markSystem(system)
	}

	get neighbourRegion(): IREGION | null {
		if (!this.system) return null
		if (this.system.region_id === systemManager.currentRegion?.id) return null

		return systemManager.regions[this.system.region_id]
	}

	goToNeighbourRegion() {
		this.closeMenu()
		if (!this.system || !this.neighbourRegion) return

		// systemManager.setCurrentRegion(this.neighbourRegion.id)
		systemManager.markSystem(this.system, true, true)
	}

	goToJBNeighbourRegion() {
		this.closeMenu()
		if (!this.jbToNeighbourRegion) return

		// systemManager.setCurrentRegion(this.jbToNeighbourRegion.id)
		systemManager.markSystem(this.jb!.systemTo!, true, true)
	}

	get jb(): EVEJumpBride | null {
		if (!this.system) return null

		const jb = systemManager.jbBySystemId[this.system.id]

		return jb?.systemToId ? jb : null
	}

	get jbToNeighbourRegion(): IREGION | null {
		if (!this.jb) return null

		return this.jb.systemTo!.region_id === systemManager.currentRegion?.id
			? null
			: systemManager.regions[this.jb.systemTo!.region_id]
	}

	get isAPIAuthed() {
		return api.auth.isAuth
	}

	get system(): EVESystem | null {
		return systemManager.getSystemById(this.options.system_id)
	}

	async apiSetDestination() {
		this.closeMenu()
		if (!this.system) return

		try {
			await api.setWaypoint(
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
			await api.setWaypoint(
				this.options.system_id,
				false, false
			)
			// eslint-disable-next-line no-empty
		} catch (e) {
		}
	}

	async apiAddWaypointJB() {
		this.closeMenu()
		if (!this.jb || !this.jb.structure_id) return

		try {
			await api.setWaypoint(
				this.jb.structure_id,
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

	get activeCharacter(): ICharacterManagerCharacter | null {
		return characterManager.activeCharacter
	}

	setSystemAsCurrent() {
		this.closeMenu()
		const activeCharacter = this.activeCharacter
		if (!this.system || !activeCharacter) return

		// systemManager.setCurrentSystem(this.system)
		characterManager.setLocation(activeCharacter.name, this.system)
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
