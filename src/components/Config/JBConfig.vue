<template>
	<div>
		<v-alert
			border="left"
			colored-border
			type="error"
			elevation="2"
			class="mx-2"
			v-if="!isAuth"
		>
			Вы не авторизованы через игру.<br>
			Для поиска структур необходимо авторизоваться в меню наверху справа.
		</v-alert>

		<v-card flat :disabled="!isAuth">
			<v-expansion-panels inset tile>
				<v-expansion-panel>
					<v-expansion-panel-header disable-icon-rotate>
						Как искать
					</v-expansion-panel-header>
					<v-expansion-panel-content>
						Поиск через ESI API структур типа бридж к которым игрок имеет доступ.
						<br>
						Оставьте строку поиска по умолчанию или добавьте свой шаблон поиска (например, название системы).
						<br>
						Шаблон должен содержать символ "»" и быть не менее 3 символов.
					</v-expansion-panel-content>
				</v-expansion-panel>
			</v-expansion-panels>

			<v-card-title>
				<v-text-field
					v-model="findPattern"
					label="Find JB"
					append-icon="mdi-close"
					@click:append="clearFindPattern"
				/>
				<v-btn
					@click="refreshAPI"
					class="mr-5" text
					:disabled="isLoading || !findPattern || findPattern.length < 3 || !findPattern.includes('»')"
				>
					<v-icon left>mdi-cloud-refresh</v-icon>
					find
				</v-btn>
				<v-btn
					color="red"
					v-if="isLoading"
					text
					@click="refreshAPIStop = true"
				>Stop JB finding
				</v-btn>
				<v-spacer/>
				<v-text-field
					v-model="filter"
					append-icon="mdi-magnify"
					label="Filter"
					clearable
				/>
			</v-card-title>
			<v-card-text>
				<v-data-table
					:items="jb"
					:headers="headers"
					:loading="isLoading"
					:search="filter"
					item-key="uuid"
					:item-class="itemJBClass"
					dense
				>
					<template v-slot:progress>
						<v-progress-linear :value="isLoadingCurrentPercent"/>
					</template>

					<template v-slot:no-data>
						<h3 class="red--text">No jump bridges</h3>
					</template>

					<template v-slot:item.status="{ item }">
						<v-tooltip bottom transition="fade-transition">
							<template v-slot:activator="{ on, attrs }">
								<v-icon v-if="item.status === EVE_JUMP_BRIDE_STATUS.NEW"
												v-bind="attrs" v-on="on" small>mdi-new-box
								</v-icon>
								<v-icon v-else-if="item.status === EVE_JUMP_BRIDE_STATUS.API_FOUND"
												v-bind="attrs" v-on="on" small>mdi-check
								</v-icon>
								<v-icon v-else-if="item.status === EVE_JUMP_BRIDE_STATUS.API_UNAVAILABLE"
												v-bind="attrs" v-on="on" small>mdi-lan-disconnect
								</v-icon>
								<v-icon v-else
												v-bind="attrs" v-on="on" small>mdi-alert-circle-outline
								</v-icon>
							</template>
							<span>{{ item.status }}</span>
						</v-tooltip>
					</template>

					<template v-slot:item.action="{ item }">
						<v-btn icon @click="refreshJB(item)" :disabled="isLoading">
							<v-icon>mdi-cloud-refresh</v-icon>
						</v-btn>

						<v-btn icon @click="deleteJB(item)" :disabled="isLoading">
							<v-icon color="red">mdi-close</v-icon>
						</v-btn>
					</template>
				</v-data-table>

			</v-card-text>
		</v-card>
	</div>
</template>

<script lang="ts">
import {Component, Vue, Watch} from "vue-property-decorator"
import api from "@/lib/EVEApi"
// import find from "lodash/find"
import EVEJumpBride, {EVE_JUMP_BRIDE_STATUS} from "@/lib/EVEJumpBride"
// eslint-disable-next-line no-unused-vars
import {DataTableHeader} from "vuetify"
import systemManager from "@/service/SystemManager"
// eslint-disable-next-line no-unused-vars
import EVESystem from "@/lib/EVESystem"
import Timeout from "await-timeout"
import * as log from "electron-log"

const INITIAL_FIND_PATTERN = " » "
const ALPHABET_PATTERN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

@Component
export default class JBConfig extends Vue {
	headers: DataTableHeader[] = [
		// {
		// 	text: "id",
		// 	sortable: true,
		// 	value: "structure_id",
		// 	filterable: true,
		// },
		{
			text: "Sts",
			sortable: true,
			value: "status",
			filterable: false,
			width: "70px",
		},
		{
			text: "Name",
			sortable: true,
			value: "name",
		},
		{
			text: "From",
			// sortable: false,
			value: "systemFrom.name",
		},
		{
			text: "To",
			// sortable: false,
			value: "systemTo.name",
		},
		{text: "action", value: "action", sortable: false, align: "end", filterable: false,},
	]

	findPattern: string = INITIAL_FIND_PATTERN

	get isAuth(): boolean {
		return api.auth.isAuth
	}

	get jb() {
		return systemManager.jb
	}

	EVE_JUMP_BRIDE_STATUS = EVE_JUMP_BRIDE_STATUS

	itemJBClass(jb: EVEJumpBride) {
		return `JB_TABLE--${jb.status}`
	}

	isLoading = false
	isLoadingCurrentPercent = 0
	refreshAPIStop = false

	filter = ""

	@Watch("isLoading")
	isLoadingWatcher(isLoading) {
		this.$emit(isLoading ? "lock" : "unlock")
	}

	async loadStructures(search: string) {
		let structures = await api.getJBs(search)

		if (!structures) {
			return
		}

		for (let i = 0; i < structures.length; i++) {
			await systemManager.addJB(structures[i])
		}
	}

	async refreshAPI() {
		this.isLoading = true
		this.refreshAPIStop = false
		this.$forceUpdate()

		try {
			if (this.findPattern === INITIAL_FIND_PATTERN) {
				const alphabet = ALPHABET_PATTERN.split("")
				for (let i = 0; i < alphabet.length; i++) {
					await this.loadStructures(INITIAL_FIND_PATTERN + alphabet[i])
				}
			} else {
				await this.loadStructures(this.findPattern)
			}

			if (this.refreshAPIStop) {
				this.isLoading = false
				systemManager.refreshRegionMap()
				return
			}

			await this.refreshStructuresAPI()
		} catch (e) {
			log.error(e)
		} finally {
			this.isLoading = false
			this.refreshAPIStop = false
			systemManager.refreshRegionMap()
		}
	}

	async refreshStructuresAPI() {
		this.refreshAPIStop = false
		this.isLoadingCurrentPercent = 0
		for (let i = 0; i < systemManager.jb.length; i++) {
			this.isLoadingCurrentPercent = Math.ceil(i * 100 / systemManager.jb.length)
			if (this.refreshAPIStop) break

			const jb = systemManager.jb[i]
			await jb.syncAPI()
			await Timeout.set(50)
		}
	}

	clearFindPattern() {
		this.findPattern = INITIAL_FIND_PATTERN
	}

	async refreshJB(jb: EVEJumpBride) {
		this.isLoading = true
		try {
			await jb.syncAPI()
			systemManager.refreshRegionMap()
			// eslint-disable-next-line no-empty
		} catch (e) {
		}
		this.isLoading = false
	}

	async deleteJB(jb: EVEJumpBride) {
		this.isLoading = true
		await systemManager.deleteJB(jb)
		this.isLoading = false
		systemManager.refreshRegionMap()
	}

	beforeDestroy() {
		this.refreshAPIStop = true
	}
}
</script>

<style lang="scss">
.JB_TABLE {
	&--NEW {
		background-color: #EEFFEE;
	}

	&--API_UNAVAILABLE {
		background-color: #E7EEFF;
	}

	&--API_NOT_FOUND, &--API_FORBIDDEN, &--API_ERROR, &--API_WRONG_STRUCTURE {
		background-color: #FFE4E4;
	}
}
</style>
