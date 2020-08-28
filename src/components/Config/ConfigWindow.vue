<template>
	<v-dialog v-model="dialog" persistent max-width="900px">
		<v-card>
			<v-card-title class="headline">{{ $t("settings") }}</v-card-title>
			<v-tabs v-model="tab" grow>

				<v-tab href="#other" :disabled="windowLock">
					Разное
				</v-tab>

				<v-tab href="#alarm" :disabled="windowLock">
					Alert
				</v-tab>

				<v-tab href="#channels" :disabled="windowLock">
					<v-icon
						left small
						v-if="noSecureChannels"
						color="red"
					>mdi-map-marker-path
					</v-icon>
					Каналы
				</v-tab>

				<v-tab href="#winLayouts" :disabled="windowLock">
					Слои
				</v-tab>

				<v-tab href="#extWindow" :disabled="windowLock">
					Внешние
				</v-tab>

				<v-tab href="#favorites" :disabled="windowLock">
					Favorites
				</v-tab>

				<v-tab href="#jb" :disabled="windowLock">
					Jump Bridges
				</v-tab>

				<v-tabs-items v-model="tab">
					<v-tab-item value="alarm">
						<v-card flat min-height="400px">
							<alarm-config @lock="windowLock = true" @unlock="windowLock = false"/>
						</v-card>
					</v-tab-item>

					<v-tab-item value="other">
						<v-card flat min-height="400px">
							<v-card-text>
								<v-select
									v-model="settings.lang"
									:items="APP_LANGUAGES"
									item-text="name"
									item-value="code"
									prepend-icon="mdi-translate"
									label="Language / Язык"
								/>

								<v-switch v-model="settings.showFleetBtn" label="Выводить переключатель панели флота"/>
								<v-switch v-model="settings.showOverlayBtn" label="Выводить переключатель слоев (alerts, kills, jumps)"/>
								<v-switch v-model="settings.followCharacterRegion" label="Автоматическая смена региона при перемещении персонажа">
									<template v-slot:append>
										<v-tooltip bottom transition="fade-transition">
											<template v-slot:activator="{ on, attrs }">
												<v-icon
													v-bind="attrs"
													v-on="on"
												>
													mdi-help-circle-outline
												</v-icon>
											</template>
											<span>
												Работает только для основного персонажа (выбирается из меню авторизации)
											</span>
										</v-tooltip>
									</template>
								</v-switch>
								<v-divider/>
								<v-btn @click="openLogFolderProgram" class="mt-4">открыть папку с логами программы</v-btn>
								<br>
								<v-btn @click="openLogFolderGame" class="mt-4">открыть папку с логами игры</v-btn>
								<p class="font-italic">Совет: периодически удаляйте старые файлы, это влияет на производительность</p>
							</v-card-text>
						</v-card>
					</v-tab-item>

					<v-tab-item value="channels">
						<v-card flat min-height="400px">
							<channels-config/>
						</v-card>
					</v-tab-item>

					<v-tab-item value="winLayouts">
						<v-card flat min-height="400px">
							<v-card-text>
								<v-alert
									border="left"
									colored-border
									type="info"
									elevation="2"
								>
									Вы можете создать список расположений окон.<br>
									Это позволит быстро переключать вид из иконки в панели задач.
								</v-alert>

								<p class="text-center">
									<v-btn @click="openLayoutsWindow">открыть настройки вида окна</v-btn>
								</p>
							</v-card-text>
						</v-card>
					</v-tab-item>

					<v-tab-item value="extWindow">
						<v-card flat min-height="400px">
							<ext-win-config/>
						</v-card>
					</v-tab-item>

					<v-tab-item value="favorites">
						<v-card flat min-height="400px">
							<v-card-title class="headline">Region Menu</v-card-title>
							<v-card-text>
								<v-autocomplete
									:items="regions"
									v-model="favoriteRegions"
									item-text="name"
									outlined autofocus dense multiple
									return-object
									chips deletable-chips small-chips
								/>
								<v-switch v-model="settings.useNavigationBtn" label="Use Back and Forward mouse buttons for region history navigation"/>
							</v-card-text>
							<v-card-title class="headline">ZKillboard</v-card-title>
							<v-card-text>
								<v-autocomplete
									:items="regions"
									v-model="favoriteZKB"
									item-text="name"
									outlined autofocus dense multiple
									return-object
									chips deletable-chips small-chips
								/>
							</v-card-text>
						</v-card>
					</v-tab-item>

					<v-tab-item value="jb">
						<v-card flat min-height="400px">
							<j-b-config @lock="windowLock = true" @unlock="windowLock = false"/>
						</v-card>
					</v-tab-item>

				</v-tabs-items>
			</v-tabs>

			<v-card-actions>
				<v-spacer/>
				<v-btn color="green darken-1" text @click="closeConfigDialog" :disabled="windowLock">Close</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import events from "@/service/EventBus"
import {ipcRenderer} from "electron"
import settingsService, {APP_LANGUAGES} from "@/service/settings"
import systemManager from "@/service/SystemManager"
import JBConfig from "@/components/Config/JBConfig.vue"
import zkillboard from "@/service/ZKillboard"
import debounce from "lodash/debounce"
import ChannelsConfig from "@/components/Config/ChannelsConfig.vue"
import ExtWinConfig from "@/components/Config/ExtWinConfig.vue"
// eslint-disable-next-line no-unused-vars
import {IREGION} from "@/types/MAP"
import AlarmConfig from "@/components/Config/AlarmConfig.vue"

@Component({
	components: {AlarmConfig, ExtWinConfig, ChannelsConfig, JBConfig}
})
export default class ConfigWindow extends Vue {
	dialog = false
	// dialog = true
	// tab = "other"
	tab: string | null = null

	windowLock = false

	APP_LANGUAGES = APP_LANGUAGES

	closeConfigDialog() {
		this.dialog = false
	}

	get regions() {
		if (!this.$store.getters.isAppReady) return []

		return Object.values(systemManager.regions)
	}

	openLogFolderProgram() {
		ipcRenderer.send("openLogFolderProgram")
	}

	openLogFolderGame() {
		ipcRenderer.send("openLogFolderGame")
	}

	get favoriteRegions() {
		const favoriteRegions = this.settings.favoriteRegions || []
		return this.regions.filter((region => favoriteRegions.includes(region.id)))
	}

	set favoriteRegions(val: IREGION[]) {
		this.settings.favoriteRegions = val.map(region => region.id)
	}

	get favoriteZKB() {
		const favoriteZKBRegions = this.settings.favoriteZKBRegions || []
		return this.regions.filter((region => favoriteZKBRegions.includes(region.id)))
	}

	openLayoutsWindow() {
		ipcRenderer.send("open:layouts")
		this.closeConfigDialog()
	}

	reconnectZKB = debounce(zkillboard.reconnectZK, 4000)

	set favoriteZKB(val: IREGION[]) {
		this.settings.favoriteZKBRegions = val.map(region => region.id)
		// TODO resubscribe not reconnect
		this.reconnectZKB()
	}

	get noSecureChannels() {
		return !settingsService.$.logChannels.length
	}

	get settings() {
		return settingsService.$
	}

	created() {
		events.$on("electron:open:config", () => {
			this.dialog = true
		})
		events.$on("open:config:channels", () => {
			this.dialog = true
			this.tab = "channels"
		})
	}
}
</script>

<i18n>
{
	"en": {
		"settings": "Settings"
	},
	"ru": {
		"settings": "Настройки"
	}
}
</i18n>
