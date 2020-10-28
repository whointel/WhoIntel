<template>
	<v-card-text>
		<v-slider
			append-icon="mdi-plus"
			prepend-icon="mdi-minus"
			:min="0"
			:max="5"
			:step="1"
			ticks
			v-model="settings.alarmDistance"
		>
			<template v-slot:label>
				<v-tooltip bottom transition="fade-transition">
					<template v-slot:activator="{ on, attrs }">
						<div
							v-bind="attrs"
							v-on="on"
						>
							<v-icon> mdi-help-circle-outline</v-icon>
							<span class="ml-2">Расстояние оповещения ({{ settings.alarmDistance }})</span>
						</div>
					</template>
					<span>
						Расстояние между текущим положением основного персонажа и системой, где произошло событие.<br>
						<b>Если расстояние будет больше указанного - оповещение не будет выведено.</b>
					</span>
				</v-tooltip>
			</template>
		</v-slider>

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

		<v-switch v-model="settings.alarmPopup" label="Визуальное оповещение (всплывающее окно popup)"/>
		<v-switch :disabled="!settings.alarmPopup" v-model="settings.alarmPopupALL" label="Дублировать в popup все сообщения (не только сообщения о присутствии врага)"/>

		<v-btn
			:disabled="!settings.alarmPopup"
			@click="testAlarmPopup"
		>
			Проверить всплывающее окно
		</v-btn>
		<v-divider/>

		<v-switch v-model="settings.alarmSound" label="Звуковое оповещение"/>

		<v-text-field
			prepend-icon="mdi-paperclip"
			label="Звуковой файл для оповещения, пустое поле для встроенного звука"
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
			Проверить звук
		</v-btn>

		<v-btn
			@click="stopTestAlarmSound"
			class="ml-2"
			v-if="isAlarmSoundTesting"
		>
			<v-icon left>mdi-stop</v-icon>
			Остановить проверку
		</v-btn>

	</v-card-text>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import {PlayAlarm, StopAlarm} from "@/service/PlayAlarm"
import settingsService from "@/service/settings"
import logReader from "@/service/LogReader"
import {LOG_ENTRY_TYPE} from "@/types/ILogEntry"

const {dialog} = require("electron").remote

@Component
export default class ConfigWindow extends Vue {
	get settings() {
		return settingsService.$
	}

	testAlarmSound() {
		PlayAlarm()
		this.isAlarmSoundTesting = true
	}

	isAlarmSoundTesting = false

	stopTestAlarmSound() {
		StopAlarm()
		this.isAlarmSoundTesting = false
	}

	testAlarmPopup() {
		logReader.showNotification("Jita / 2", {
			ts: new Date,
			sender: "TEST",
			message: "TEST ALERT",
			channel: "TEST",
			systems: [],
			hash: "TEST",
			character: null,
			type: LOG_ENTRY_TYPE.SECURE
		}, false)
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
					{name: "Media", extensions: ["mp3", "wav", "ogg"]},
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
