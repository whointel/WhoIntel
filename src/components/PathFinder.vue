<template>
	<v-navigation-drawer :width="300" class="path-finder" app :permanent="false" stateless :value="isShow">
		<template v-slot:prepend>
			<div class="path-finder--plate px-2 pt-1">
				<v-row>
					<v-col class="py-0 pl-1 pr-0" :cols="1">
						<v-btn icon small @click="setStartCurrentSystem">
							<v-icon small>mdi-map-marker</v-icon>
						</v-btn>
					</v-col>
					<v-col class="py-0 pl-1 pr-0">
						<v-autocomplete
							item-text="name"
							v-model="startSystem"
							:items="allSystems"
							hide-no-data dense hide-details
							placeholder="Откуда"
							return-object
						/>
					</v-col>
					<v-col class="py-0 pl-1 pr-0">
						<v-autocomplete
							item-text="name"
							v-model="endSystem"
							:items="allSystems"
							hide-no-data dense hide-details
							placeholder="Куда"
							return-object
						/>
					</v-col>
					<v-col class="py-0 pl-1 pr-0" :cols="2">
						<path-finder-copy-btn :pathPoints="pathPoints"/>
					</v-col>
				</v-row>
			</div>
		</template>

		<v-list dense>
			<v-subheader v-if="pathPoints.path.length > 0" class="subtitle-2">
				{{ pathPoints.path.length - 1 }}j:
			</v-subheader>
			<v-list-item
				class="px-2"
				v-for="(pathPoint, index) in pathPoints.path" :key="index"
				@click.prevent="setMarker(pathPoint.system)"
			>
				<v-list-item-action class="mr-2 ml-0">
					<span class="caption font-weight-black" :style="'color:'+pathPoint.system.securityColor" v-html="pathPoint.system.securityFormatted"></span>
				</v-list-item-action>
				<v-list-item-content>
					<v-list-item-title>
						<span>{{ pathPoint.system.name }}</span>&nbsp;
						<span class="grey--text">{{ pathPoint.system.region.name }}</span>
					</v-list-item-title>
					<v-list-item-subtitle v-if="pathPoint.jb">{{ pathPoint.jb.name }}</v-list-item-subtitle>
				</v-list-item-content>
			</v-list-item>
		</v-list>

		<template v-slot:append>
			<v-row class="path-finder--plate">
				<v-col :cols="6">
					<v-btn
						small
						class="ml-2"
						color="orange"
						:disabled="disableGoBtn || !isAPIAuthed"
						@click="apiSetDestinationPathGo"
					>
						в добрый путь
					</v-btn>
				</v-col>
				<v-col :cols="3" class="px-1">
					<v-btn small @click="clear">clear</v-btn>
				</v-col>
				<v-col :cols="3" class="px-1">
					<v-btn small @click="close">close</v-btn>
				</v-col>
			</v-row>
		</template>
	</v-navigation-drawer>
</template>

<script lang="ts">
import {Component, Vue, Watch} from "vue-property-decorator"
import PathFinderCopyBtn from "@/components/PathFinderCopyBtn.vue"
import api from "@/lib/EVEApi"
import EVESystem from "@/lib/EVESystem"
import systemManager from "@/service/SystemManager"
import {IPATHPOINT} from "@/types/PathFinder"
import Timeout from "await-timeout"
import pathService from "@/service/PathService"

@Component({
	components: {PathFinderCopyBtn}
})
export default class PathFinder extends Vue {
	get allSystems(): EVESystem[] {
		if (!this.$store.getters.isAppReady) return []

		return Object.values(systemManager.systemsById) as EVESystem[]
	}

	disableGoBtn = false

	@Watch("pathPoints.path")
	reActivateGoBtn(value: any[]) {
		this.disableGoBtn = value.length <= 0
	}

	get isAPIAuthed() {
		return api.auth.isAuth
	}

	get isShow() {
		return this.$store.getters.showPathPanel
	}

	get pathPoints(): IPATHPOINT {
		return pathService.pathPoints
	}

	get startSystem(): EVESystem {
		return systemManager.getSystemById(this.pathPoints.start)!
	}

	set startSystem(system: EVESystem) {
		pathService.setStart(system.id)
	}

	get endSystem(): EVESystem {
		return systemManager.getSystemById(this.pathPoints.end)!
	}

	set endSystem(system: EVESystem) {
		pathService.setEnd(system.id)
	}

	setStartCurrentSystem() {
		pathService.setStartFromCurrentSystem()
	}

	async apiSetDestinationPathGo() {
		if (!this.pathPoints) return
		this.disableGoBtn = true
		let isFirst = true
		for (const id of this.pathPoints.structures) {
			await api.setWaypoint(id, isFirst)
			isFirst = false
			await Timeout.set(50)
		}
	}

	setMarker(system: EVESystem) {
		systemManager.markSystem(system, true)
	}

	clear() {
		pathService.setStart(0)
		pathService.setEnd(0)
	}

	close() {
		this.$store.commit("setShowPathPanel", false)
	}
}
</script>

<style lang="sass">
@import "src/scss/theme"
.path-finder--plate
	.v-input
		font-size: 14px


+theme-glob(path-finder) using($material)
	.path-finder--plate
		background-color: map-get($material, 'plate')
</style>
