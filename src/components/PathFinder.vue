<template>
	<v-navigation-drawer app :permanent="false" stateless :value="isShow">
		<template v-slot:prepend>
			<div class="ma-2">
				<div class="ml-4 subtitle-1">
					{{ startSystemName }} -> {{ endSystemName }}
					<v-tooltip bottom transition="fade-transition">
						<template v-slot:activator="{ on, attrs }">
							<v-btn icon v-bind="attrs" v-on="on" @click="copyPath">
								<v-icon small>{{ copyIcon }}</v-icon>
							</v-btn>
						</template>
						<span>Скопировать путь в буфер обмена</span>
					</v-tooltip>
				</div>
			<!--	TODO			<div class="ml-4 caption">для персонажа</div>-->
			</div>
		</template>

		<v-list dense>
			<v-list-item
				v-for="(pathPoint, index) in pathPoints.path" :key="index"
				@click.prevent="setMarker(pathPoint.system)"
			>
				<v-list-item-icon>
					<v-icon>mdi-map-marker-path</v-icon>
				</v-list-item-icon>
				<v-list-item-content>
					<v-list-item-title>
						<a href="#" @click.prevent="setMarker(pathPoint.system)">{{ pathPoint.system.name }}</a>
					</v-list-item-title>
					<v-list-item-subtitle v-if="pathPoint.jb">{{ pathPoint.jb.name }}</v-list-item-subtitle>
					<v-list-item-subtitle>{{ pathPoint.system.region.name }}</v-list-item-subtitle>
				</v-list-item-content>
			</v-list-item>
		</v-list>

		<template v-slot:append>
			<div class="pa-2">
				<v-btn
					block
					color="orange"
					:disabled="disableGoBtn"
					@click="apiSetDestinationPathGo">в добрый путь
				</v-btn>
			</div>

			<div class="pa-2">
				<v-btn block @click="resetPathPoints">close</v-btn>
			</div>
		</template>
	</v-navigation-drawer>
</template>

<script lang="ts">
import {Component, Vue, Watch} from "vue-property-decorator"
import api from "@/lib/EVEApi"
// eslint-disable-next-line no-unused-vars
import EVESystem from "@/lib/EVESystem"
import systemManager from "@/service/SystemManager"
import events from "@/service/EventBus"
// eslint-disable-next-line no-unused-vars
import {IPATHPOINT} from "@/types/PathFinder"
import Timeout from "await-timeout"

@Component
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

	showCopied = false

	async copyPath() {
		this.showCopied = true

		await navigator.clipboard.writeText(this.pathString)
		await Timeout.set(1000)
		this.showCopied = false
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
