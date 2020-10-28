<template>
	<div>
		<v-tooltip bottom transition="fade-transition">
			<template v-slot:activator="{ on, attrs }">
				<v-icon
					@click="openSearch"
					v-bind="attrs"
					v-on="on"
				>mdi-magnify
				</v-icon>
			</template>
			<span>Ctrl+F</span>
		</v-tooltip>
		<v-dialog
			v-model="isShow"
			max-width="500px"
			transition="fade-transition"
		>
			<v-card tile>
				<v-container class="pa-y px-2">
					<v-autocomplete
						@change="onFound"
						v-model="select"
						:items="items"
						:search-input.sync="search"
						item-text="title"
						append-outer-icon="mdi-magnify"
						hide-no-data no-filter auto-select-first dense autofocus
						placeholder="Search for.."
						return-object
						ref="input"
					>
						<template v-slot:item="{item}">
							<v-list-item-content>
								<v-list-item-title>
									<h4>{{ item.entity.name }}</h4>
								</v-list-item-title>
							</v-list-item-content>

							<v-list-item-action v-if="item.type === SEARCH_RESULT_TYPE.REGION">
								<span class="grey--text caption">Region</span>
							</v-list-item-action>
							<v-list-item-action v-if="item.type === SEARCH_RESULT_TYPE.SYSTEM">
								<span class="grey--text caption">System in {{ item.entity.region.name }}</span>
							</v-list-item-action>

						</template>
					</v-autocomplete>
				</v-container>
			</v-card>
		</v-dialog>
	</div>
</template>

<script lang="ts">
import {Component, Vue, Watch} from "vue-property-decorator"
import debounce from "lodash/debounce"
import trim from "lodash/trim"
import systemManager from "@/service/SystemManager"
import EVESystem from "@/lib/EVESystem"
import {REGION} from "@/types/RegionMap"

enum SEARCH_RESULT_TYPE {
	SYSTEM,
	REGION,
}

interface ISearchResult {
	type: SEARCH_RESULT_TYPE
	entity: EVESystem | REGION
	title: string,
}

@Component
export default class Search extends Vue {
	isShow = false
	search = ""
	items: ISearchResult[] = []
	select = null

	SEARCH_RESULT_TYPE = SEARCH_RESULT_TYPE

	$refs!: {
		input: HTMLElement,
	}

	openSearch() {
		this.isShow = true
		this.search = ""
		this.$nextTick(() => {
			this.$refs.input && this.$refs.input.focus()
		})
	}

	doSearch = debounce(this.doSearchAction, 400)

	async onFound(item: ISearchResult) {
		if (!this.isShow || !item) {
			return
		}

		if (item.type === SEARCH_RESULT_TYPE.REGION) {
			await systemManager.setCurrentRegion(item.entity.id)
		}

		if (item.type === SEARCH_RESULT_TYPE.SYSTEM) {
			systemManager.markSystem(item.entity as EVESystem, true)
		}

		this.close()
	}

	close() {
		this.search = ""
		this.isShow = false
	}

	async doSearchAction(val) {
		this.items = []

		const num = Number(val)
		const isNum = num > 0

		for (const id in systemManager.regions) {
			const region = systemManager.regions[id]
			if (isNum) {
				if (id.includes(val)) {
					this.items.push({
						type: SEARCH_RESULT_TYPE.REGION,
						entity: region as REGION,
						title: region.name,
					})
				}
			}

			val = val.toUpperCase()
			if (region.name.toUpperCase().includes(val)) {
				this.items.push({
					type: SEARCH_RESULT_TYPE.REGION,
					entity: region as REGION,
					title: region.name,
				})
			}
		}

		for (const id in systemManager.systemsById) {
			const system = systemManager.systemsById[id]
			if (isNum) {
				if (id.includes(val)) {
					this.items.push({
						type: SEARCH_RESULT_TYPE.SYSTEM,
						entity: system as EVESystem,
						title: system.name,
					})
				}
			}

			val = val.toUpperCase()
			if (system.name.toUpperCase().includes(val)) {
				this.items.push({
					type: SEARCH_RESULT_TYPE.SYSTEM,
					entity: system as EVESystem,
					title: system.name,
				})
			}
		}
	}

	@Watch("search")
	async onSearch(val) {
		if (!val) {
			return
		}

		val = trim(val)
		if (val.length < 2) {
			return
		}

		this.doSearch(val)
	}

	created() {
		window.document.addEventListener("keydown", (event) => {
			if (event.code === "KeyF" && event.ctrlKey) {
				event.preventDefault()
				this.openSearch()
			}
		})

		window.document.addEventListener("keyup", (event) => {
			if (event.code !== "Esc") return

			if (this.isShow) {
				this.close()
				event.stopPropagation()
			}
		})
	}
}
</script>
