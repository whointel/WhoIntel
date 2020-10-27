<template>
	<div>
		<v-alert
			border="left"
			colored-border
			type="error"
			elevation="2"
			class="mx-2"
			v-if="!isAuthed"
		>
			Вы не авторизованы через игру.<br>
			Для поиска структур необходимо авторизоваться в меню наверху справа.
		</v-alert>

		<v-card flat :disabled="!isAuthed">
			<v-expansion-panels inset tile>
				<v-expansion-panel>
					<v-expansion-panel-header disable-icon-rotate>
						Как искать
					</v-expansion-panel-header>
					<v-expansion-panel-content>
						Поиск через ESI API структур типа "мост" (Ansiblex Jump Gate) к которым игрок имеет доступ.
						<br>
						Оставьте строку поиска по умолчанию или добавьте свой шаблон поиска (например, название системы).
						<br>
						Шаблон должен содержать символ "»" и быть не менее 3 символов.
					</v-expansion-panel-content>
				</v-expansion-panel>
				<v-expansion-panel>
					<v-expansion-panel-header disable-icon-rotate>
						Находит не все JB?
					</v-expansion-panel-header>
					<v-expansion-panel-content>
						Программа умеет искать JB, но CPP сломали свой API поиска - он отдает не все результаты.
						<br>
						Параллельно с этим CPP объявили запрет на использование вариантов обхода сломанного API
						<a @click.prevent.stop="openExternal('https://developers.eveonline.com/blog/article/the-esi-api-is-a-shared-resource-do-not-abuse-it')" href="https://developers.eveonline.com/blog/article/the-esi-api-is-a-shared-resource-do-not-abuse-it">https://developers.eveonline.com/blog/article/the-esi-api-is-a-shared-resource-do-not-abuse-it</a>
						<br>
						<br>
						Что можно сделать?
						<br>
						1. Если вы уверены что в системе есть JB, введите в строку поиска " » НАЗВАНИЕ СИСТЕМЫ", например " » Jita" - программа добавить новый JB к общему списку.
						<br>
						2. Спрашивать с CPP когда будет починен API тут
						<a @click.prevent.stop="openExternal('https://github.com/esi/esi-issues/issues/108')" href="https://github.com/esi/esi-issues/issues/108">https://github.com/esi/esi-issues/issues/108</a>
					</v-expansion-panel-content>
				</v-expansion-panel>
				<v-expansion-panel>
					<v-expansion-panel-header disable-icon-rotate>
						Искать через ESI API разрешено CPP?
					</v-expansion-panel-header>
					<v-expansion-panel-content>
						CPP <a @click.prevent.stop="openExternal('https://developers.eveonline.com/blog/article/the-esi-api-is-a-shared-resource-do-not-abuse-it')" href="https://developers.eveonline.com/blog/article/the-esi-api-is-a-shared-resource-do-not-abuse-it">наложили жесткие ограничения</a> на API поиска,
						однако давно существуют программы, аналогичные WhoIntel, которые используют поиск для поиска Мостов.
						<br>
						Пример -
						<a @click.prevent.stop="openExternal('https://forums.eveonline.com/t/smt-eve-map-tool/3845/217')" href="https://forums.eveonline.com/t/smt-eve-map-tool/3845/217">SMT</a>.
						<br>
						<br>
						Заметка для CPP - данная программа никак не автоматизирует использование ESI API поиска - пользователь самостоятельно инициализирует поиск нажатием на кнопку.
					</v-expansion-panel-content>
				</v-expansion-panel>
			</v-expansion-panels>
			<v-card-title>
				<v-text-field
					v-model="findPattern"
					label="Введите шаблон для поиска мостов"
					append-icon="mdi-close"
					@click:append="clearFindPattern"
				/>
				<v-btn
					@click="refreshAPI"
					class="ml-5 mr-5"
					:disabled="isLoading || !findPattern || findPattern.length < 3 || !findPattern.includes('»')"
				>
					<v-icon left>mdi-cloud-refresh</v-icon>
					Искать
				</v-btn>
				<v-btn
					color="red"
					v-if="isLoading"
					@click="refreshAPIStop = true"
				>Остановить поиск
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
					sort-by="status" :sort-desc="false"
					dense
				>
					<template v-slot:progress>
						<v-progress-linear :value="loadingCurrentPercent"/>
					</template>

					<template v-slot:no-data>
						<h3 class="red--text">No jump bridges</h3>
					</template>

					<template v-slot:item.name="{ item }">
						{{ item.status === EVE_JUMP_BRIDGE_STATUS.NEW ? item.structure_id : item.name }}
					</template>

					<template v-slot:item.systemTo.name="{ item }">
						<span v-if="item.systemTo">{{ item.systemTo.name }} <span class="grey--text">{{ item.systemTo.region.name }}</span></span>
					</template>

					<template v-slot:item.systemFrom.name="{ item }">
						<span v-if="item.systemFrom">{{ item.systemFrom.name }} <span class="grey--text">{{ item.systemFrom.region.name }}</span></span>
					</template>

					<template v-slot:item.status="{ item }">
						<v-tooltip bottom transition="fade-transition">
							<template v-slot:activator="{ on, attrs }">
								<v-icon v-if="item.status === EVE_JUMP_BRIDGE_STATUS.NEW"
												v-bind="attrs" v-on="on" small>mdi-new-box
								</v-icon>
								<v-icon v-else-if="item.status === EVE_JUMP_BRIDGE_STATUS.API_FOUND"
												v-bind="attrs" v-on="on" small color="grey lighten-1">mdi-check
								</v-icon>
								<v-icon v-else-if="item.status === EVE_JUMP_BRIDGE_STATUS.API_UNAVAILABLE"
												v-bind="attrs" v-on="on" small>mdi-lan-disconnect
								</v-icon>
								<v-icon v-else-if="item.status === EVE_JUMP_BRIDGE_STATUS.API_FORBIDDEN"
												v-bind="attrs" v-on="on" small>mdi-alert-circle-outline
								</v-icon>
								<v-icon v-else
												v-bind="attrs" v-on="on" small>mdi-alert-circle-outline
								</v-icon>
							</template>
							<span v-if="item.status === EVE_JUMP_BRIDGE_STATUS.NEW">Новый</span>
							<span v-else-if="item.status === EVE_JUMP_BRIDGE_STATUS.API_FOUND">OK</span>
							<span v-else-if="item.status === EVE_JUMP_BRIDGE_STATUS.API_UNAVAILABLE">Ошибка API</span>
							<span v-else-if="item.status === EVE_JUMP_BRIDGE_STATUS.API_FORBIDDEN">Нет доступа к структуре</span>
							<span v-else>{{ item.status }}</span>
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

				<v-alert
					border="left"
					colored-border
					type="info"
					elevation="2"
				>
					Не забывайте периодически перезапускать поиск - мосты могут появляться и исчезать!
				</v-alert>

			</v-card-text>
		</v-card>
	</div>
</template>

<script lang="ts">
import {Component, Vue, Watch} from "vue-property-decorator"
import EVEJumpBridge, {EVE_JUMP_BRIDGE_STATUS} from "@/lib/EVEJumpBridge"
import {DataTableHeader} from "vuetify"
import systemManager from "@/service/SystemManager"
import Timeout from "await-timeout"
import * as log from "electron-log"
import events from "@/service/EventBus"
import {shell} from "electron"
import characterManager from "@/service/CharacterManager"

const INITIAL_FIND_PATTERN = " » "
// const ALPHABET_PATTERN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

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
			text: "",
			sortable: true,
			value: "status",
			filterable: false,
			width: "10px",
		},
		{
			text: "Name",
			sortable: true,
			value: "name",
		},
		{
			text: "From",
			sortable: true,
			value: "systemFrom.name",
		},
		{
			text: "To",
			sortable: true,
			value: "systemTo.name",
		},
		{text: "action", value: "action", sortable: false, align: "end", filterable: false,},
	]

	findPattern: string = INITIAL_FIND_PATTERN

	get isAuthed(): boolean {
		return characterManager.activeCharacter?.auth.isAuthed|| false
	}

	get jb() {
		return systemManager.jb
	}

	EVE_JUMP_BRIDGE_STATUS = EVE_JUMP_BRIDGE_STATUS

	itemJBClass(jb: EVEJumpBridge) {
		return `JB_TABLE--${jb.status}`
	}

	isLoading = false
	loadingCurrentPercent = 0
	refreshAPIStop = false

	filter = ""

	async loadStructures(search: string) {
		const {data: {structure: structures}} = (await characterManager.activeCharacter?.searchStructure$(search, false).toPromise()) || {data: {structure: null}}

		if (!structures) {
			return
		}

		for (let i = 0; i < structures.length; i++) {
			await systemManager.addJB(structures[i])
		}
	}

	async refreshAPI() {
		this.setLoadingCurrentPercent(0)
		this.refreshAPIStop = false
		this.$forceUpdate()

		try {
			// bug https://github.com/esi/esi-issues/issues/108
			// same as done at https://forums.eveonline.com/t/smt-eve-map-tool/3845/217

			// NOTE disable full JB search
			// if (this.findPattern === INITIAL_FIND_PATTERN) {
			// 	const alphabet = ALPHABET_PATTERN.split("")
			// 	for (let i = 0; i < alphabet.length; i++) {
			// 		await this.loadStructures(INITIAL_FIND_PATTERN + alphabet[i])
			//    await Timeout.set(500)
			// 	}
			// } else {
			// 	await this.loadStructures(this.findPattern)
			// }

			await this.loadStructures(this.findPattern)

			if (this.refreshAPIStop) {
				this.setLoadingCurrentPercent(null)
				systemManager.refreshRegionMap()
				return
			}

			await this.refreshStructuresAPI()
		} catch (e) {
			log.error(e)
		} finally {
			this.setLoadingCurrentPercent(null)
			this.refreshAPIStop = false
			systemManager.refreshRegionMap()
		}
	}

	setLoadingCurrentPercent(percent: number|null) {
		if (percent === null) {
			this.isLoading = false
			this.loadingCurrentPercent = 0
			this.$store.commit("setLoaderPercent", percent)
		} else {
			this.isLoading = true
			this.loadingCurrentPercent = percent
			this.$store.commit("setLoaderPercent", percent)
		}
	}

	async refreshStructuresAPI() {
		this.refreshAPIStop = false
		this.loadingCurrentPercent = 0
		this.setLoadingCurrentPercent(0)
		for (let i = 0; i < systemManager.jb.length; i++) {
			this.setLoadingCurrentPercent(Math.ceil(i * 100 / systemManager.jb.length))
			if (this.refreshAPIStop) break

			const jb = systemManager.jb[i]
			await jb.syncAPI()
			await Timeout.set(100)
		}
		events.$emit("JB:ready")
	}

	clearFindPattern() {
		this.findPattern = INITIAL_FIND_PATTERN
	}

	async refreshJB(jb: EVEJumpBridge) {
		this.isLoading = true
		try {
			await jb.syncAPI()
			systemManager.refreshRegionMap()
			// eslint-disable-next-line no-empty
		} catch (e) {
		}
		this.setLoadingCurrentPercent(null)
	}

	async deleteJB(jb: EVEJumpBridge) {
		this.isLoading = true
		await systemManager.deleteJB(jb)
		this.setLoadingCurrentPercent(null)
		systemManager.refreshRegionMap()
	}

	beforeDestroy() {
		this.refreshAPIStop = true
	}

	openExternal(link: string) {
		shell.openExternal(link)
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
