<template>
	<v-navigation-drawer class="path-finder" app :permanent="false" stateless :value="isShow">
		<template v-slot:prepend>
			<div class="path-finder--plate px-2 pt-1">
				<div class="ml-4 subtitle-1">
					<span class="path-finder--title">{{ pathPoints.path.length - 1 }}j {{ startSystemName }} -> {{ endSystemName }}</span>
					<path-finder-copy-btn :pathPoints="pathPoints"/>
				</div>
			</div>
		</template>

		<v-list dense>
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
				<v-col>
					<v-btn
						class="ml-2"
						color="orange"
						:disabled="disableGoBtn"
						@click="apiSetDestinationPathGo">в добрый путь
					</v-btn>
				</v-col>
				<v-col>
					<v-btn @click="resetPathPoints">close</v-btn>
				</v-col>
			</v-row>
		</template>
	</v-navigation-drawer>
</template>

<script lang="ts">
import {Component, Vue, Watch} from "vue-property-decorator"
import PathFinderCopyBtn from "@/components/PathFinderCopyBtn.vue"
import api from "@/lib/EVEApi"
// eslint-disable-next-line no-unused-vars
import EVESystem from "@/lib/EVESystem"
import systemManager from "@/service/SystemManager"
import events from "@/service/EventBus"
// eslint-disable-next-line no-unused-vars
import {IPATHPOINT} from "@/types/PathFinder"
import Timeout from "await-timeout"

@Component({
	components: {PathFinderCopyBtn}
})
export default class PathFinder extends Vue {
	isShow = false
	disableGoBtn = false

	pathPoints: IPATHPOINT = {
		path: [],
		structures: [],
	}

	@Watch("pathPoints.path")
	showSwitcher(val) {
		this.isShow = val.length > 0
	}

	get startSystemName() {
		return this.pathPoints.path[0]?.system.name
	}

	get endSystemName() {
		return this.pathPoints.path[this.pathPoints.path.length - 1]?.system.name
	}

	created() {
		events.$on("setPathPoints", pathPoints => {
				this.pathPoints = pathPoints
				this.disableGoBtn = false
			}
		)
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

	resetPathPoints() {
		this.pathPoints = {
			path: [],
			structures: [],
		}
	}
}
</script>

<style>
.path-finder--title {
	vertical-align: middle;
}
</style>

<style lang="sass">
@import "src/scss/theme"

+theme-glob(path-finder) using($material)
	.path-finder--plate
		background-color: map-get($material, 'plate')
</style>
