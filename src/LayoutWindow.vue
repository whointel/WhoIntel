<template>
	<v-app>
		<v-main>
			<v-card tile class="container">
				<div class="d-block content">
					<v-card-title class="headline">
						Расположение окон
						<v-spacer/>
						<v-switch dense v-model="settings.layoutsWindowAdvancedMode" label="Расширенный режим настроек"/>
					</v-card-title>
					<v-data-table
						:items="layouts"
						:headers="headers"
						:expanded.sync="expanded"
						item-key="uuid"
						show-expand
						dense
					>
						<template v-slot:item.actions="{ item }">
							<v-btn class="mr-3" outlined x-small @click="applyItem(item)">
								применить
							</v-btn>
							<v-btn icon @click="deleteItem(item)">
								<v-icon color="red">mdi-close</v-icon>
							</v-btn>
						</template>

						<template v-slot:expanded-item="{ headers, item }">
							<layout-window-layout
								:colspan="headers.length"
								:layout="item"
								:advanced_mode="settings.layoutsWindowAdvancedMode"
							/>
						</template>
					</v-data-table>
				</div>

				<div class="d-block">
					<v-card-actions>
						<v-btn
							color="blue darken-4" text
							@click="addNew"
						>Добавить
						</v-btn>
						<v-btn
							color="grey" text
							@click="restoreDefault"
						>восстановить начальные
						</v-btn>
						<v-spacer/>
						<v-btn color="green darken-1" @click="closeLayoutWindow" text>Закрыть</v-btn>
					</v-card-actions>
				</div>
			</v-card>
		</v-main>
	</v-app>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import findIndex from "lodash/findIndex"
import layoutService from "@/service/LayoutService"
// eslint-disable-next-line no-unused-vars
import {IWindowLayout} from "@/types/WidnowLayout"
import LayoutWindowLayout from "@/LayoutWindowLayout.vue"
import settingsService from "@/service/settings"
import {ipcRenderer} from "electron";
import events from "@/service/EventBus";

@Component({
	components: {LayoutWindowLayout}
})
export default class LayoutWindow extends Vue {
	headers = [
		{text: "", value: "data-table-expand"},
		{
			text: "title",
			align: "start",
			sortable: true,
			value: "title",
		},
		{text: "actions", value: "actions", sortable: false, align: "end"},
	]

	get settings() {
		return settingsService.$
	}

	get layouts(): IWindowLayout[] {
		return layoutService.layouts
	}

	expanded = []

	deleteItem(item: IWindowLayout) {
		const index = findIndex(this.layouts, item)
		if (index >= 0) {
			this.layouts.splice(index, 1)
		}
	}

	addNew() {
		layoutService.addNew()
	}

	restoreDefault() {
		layoutService.restoreDefault()
	}

	applyItem(item: IWindowLayout) {
		// мы в другом окне
		// layoutService.apply(item.uuid)
		events.sendToMain("window:layouts:apply:request", item.uuid)
	}

	closeLayoutWindow() {
		ipcRenderer.send("close:layouts")
	}
}
</script>

<style scoped>
.container {
	height: 100vh;
	display: flex;
	flex-direction: column;
}

.content {
	height: 100%;
	overflow-y: auto !important;
}
</style>
