<template>
	<v-card-text>
		<v-alert
			border="left"
			colored-border
			type="info"
			elevation="2"
		>
			Список secure каналов для отслеживания.
			Новые сообщения приходят только когда открыта игра и в ней открыты secure каналы.
			"Local" отслеживается автоматически.
			<br>
			Не забудьте включить сохранение чатов на диск (меню -> настройки -> чаты -> записывать лог чата в файл,
			<a @click.prevent.stop="openInternal('https://whointel.space/enable_file_log/')" href="https://whointel.space/enable_file_log/">смотреть с картинками</a>).
		</v-alert>
		<v-data-table
			:items="settings.logChannels"
			:headers="headers"
		>
			<template v-slot:no-data>
				<h3 class="red--text">No secure channels</h3>
			</template>
			<template v-slot:item.actions="{ item }">
				<v-btn icon @click="deleteLogChannel(item)">
					<v-icon color="red">mdi-close</v-icon>
				</v-btn>
			</template>
		</v-data-table>

		<v-row>
			<v-col>
				<v-text-field
					clearable outlined
					label="Add new channel"
					v-model="newLogChannel"
				/>
			</v-col>
			<v-col>
				<v-btn
					@click="addLogChannel"
				>Add
				</v-btn>
			</v-col>
		</v-row>
	</v-card-text>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import settingsService from "@/service/settings"
import findIndex from "lodash/findIndex"
import {ipcRenderer} from "electron";

@Component
export default class ChannelsConfig extends Vue {
	newLogChannel = ""
	headers = [
		{
			text: 'name',
			align: 'start',
			sortable: true,
			value: 'name',
		},
		{text: 'actions', value: 'actions', sortable: false, align: "end"},
	]

	get settings() {
		return settingsService.$
	}

	addLogChannel() {
		if (!this.newLogChannel || !this.newLogChannel.length) return

		this.settings.logChannels.push({
			name: this.newLogChannel.trim(),
		})
		this.newLogChannel = ""
	}

	deleteLogChannel(item) {
		const index = findIndex(this.settings.logChannels, item)
		if (index >= 0) {
			this.settings.logChannels.splice(index, 1)
		}
	}

	openInternal(link: string) {
		ipcRenderer.send("openLink", link)
	}

}
</script>
