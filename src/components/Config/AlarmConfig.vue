<template>
	<v-card-text>
		<v-slider
			append-icon="mdi-plus"
			prepend-icon="mdi-minus"
			:min="0"
			:max="5"
			:step="1"
			ticks
			:label="'Alarm distance (' + settings.alarmDistance + ')'"
			v-model="settings.alarmDistance"
		/>

		<v-text-field
			v-model="settings.alarmExpireMinutes"
			label="Устаревание сообщений zkillboard, минут"
			type="number"
		>
			<template v-slot:prepend>
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
						Килы с zkillboard могут приходит с запозданием.<br>
						Число, указанное в этой настройке - количество минут, после которого килл с zkillboard
						считается устаревшим. <br>
						<b>Устаревшие килы не вызывают оповещения.</b>
					</span>
				</v-tooltip>
			</template>
		</v-text-field>

		<v-switch v-model="settings.alarmPopup" label="Alarm popup"/>

		<v-divider/>

		<v-switch v-model="settings.alarmSound" label="Alarm sound"/>

		<v-text-field
			prepend-icon="mdi-paperclip"
			label="Alarm Media, empty for default"
			clearable
			@click:prepend="chooseAlarmMedia(true)"
			:disabled="!settings.alarmSound"
			v-model="settings.alarmMedia"
			@click="chooseAlarmMedia(false)"
			readonly
			:error-messages="isAlarmMediaDialogShow ? 'Выберите файл в диалоговом окне' : null"
			:loading="isAlarmMediaDialogShow"
		/>

		<v-slider
			append-icon="mdi-volume-high"
			prepend-icon="mdi-volume-low"
			:min="0"
			:max="100"
			:step="1"
			:label="'Volume (' + settings.alarmVolume + ')'"
			:disabled="!settings.alarmSound"
			v-model="settings.alarmVolume"
		/>
		<v-btn
			:disabled="!settings.alarmSound"
			@click="testAlarmSound"
		>
			<v-icon left>mdi-play</v-icon>
			Test volume
		</v-btn>

	</v-card-text>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import {PlayAlarm} from "@/service/PlayAlarm"
import settingsService from "@/service/settings"

const {dialog} = require('electron').remote

@Component
export default class ConfigWindow extends Vue {
	get settings() {
		return settingsService.$
	}

	testAlarmSound() {
		PlayAlarm()
	}

	isAlarmMediaDialogShow = false

	async chooseAlarmMedia(force: boolean) {
		if (this.isAlarmMediaDialogShow) return
		if (!force && this.settings.alarmMedia && this.settings.alarmMedia.length) return

		this.isAlarmMediaDialogShow = true
		this.$emit("lock")

		try {
			let result = await dialog.showOpenDialog({
				title: "Choose Alarm media",
				properties: ["openFile", "dontAddToRecent"],
				filters: [
					{name: "Media", extensions: ['mp3', 'wav', 'ogg']},
				]
			})
			if (!result.canceled) {
				const file = result.filePaths[0]
				if (file) {
					this.settings.alarmMedia = file
				}
			}

			// eslint-disable-next-line no-empty
		} catch (e) {
		}
		this.isAlarmMediaDialogShow = false
		this.$emit("unlock")
	}
}
</script>
