<template>
	<div>
		<v-menu
			offset-y
			:close-on-content-click="false"
			:nudge-width="200"
			v-model="menu"
		>
			<template v-slot:activator="{ on, attrs }">
				<v-chip
					x-small color="orange" outlined label
					v-bind="attrs"
					v-on="on"
				>
					{{ region.name }}
				</v-chip>
			</template>

			<v-card :disabled="isLoading">
				<v-card-text>
					<v-row>
						<v-col :cols="10" class="pr-0">
							<v-autocomplete
								v-model="region"
								:items="regions"
								item-text="name"
								outlined autofocus dense hide-details
								return-object
							/>
						</v-col>
						<v-col :cols="2" class="px-0 text-center">
							<v-btn icon @click="showNewEdenMap">
								<v-icon>mdi-earth</v-icon>
							</v-btn>
						</v-col>
					</v-row>
					<v-row>
						<v-col>
							<v-btn
								v-for="region in favoriteRegions"
								:key="region.id"
								class="mr-3"
								@click="setRegion(region)"
							>
								{{ region.name }}
							</v-btn>
						</v-col>
					</v-row>
				</v-card-text>
			</v-card>
		</v-menu>
	</div>
</template>

<script lang="ts">
import {Component, Vue, Watch} from "vue-property-decorator"
import systemManager from "@/service/SystemManager"
import events from "@/service/EventBus"
import settingsService from "@/service/settings"
import {IREGION} from "@/types/MAP"

@Component
export default class RegionsMenu extends Vue {
	menu = false
	region = {id: 0, name: "[region loading]"}

	showNewEdenMap() {
		events.$emit("showNewEden")
		this.menu = false
	}

	get isLoading() {
		return this.$store.getters.isLoading
	}

	get regions(): IREGION[] {
		if (!this.$store.getters.isAppReady) return []

		return Object.values(systemManager.regions) as IREGION[]
	}

	@Watch("region", {immediate: false})
	changeRegion(region) {
		this.menu = false
		systemManager.setCurrentRegion(region.id)
	}

	setRegion(region) {
		this.region = region
	}

	get favoriteRegions() {
		const favoriteRegions = settingsService.$.favoriteRegions || []
		return this.regions.filter((region => favoriteRegions.includes(region.id)))
	}

	created() {
		events.$on("updateCurrentRegion", this.setRegion)
	}
}
</script>
