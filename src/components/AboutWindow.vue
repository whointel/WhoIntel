<template>
	<div>
		<portal
			to="chrome-window-btn"
			v-if="status === UPDATE_STATUSES.UPDATE_AVAILABLE"
		>
			<v-chip
				x-small color="green" outlined label
				@click="dialog = true"
			>New version found: {{ newVersion }}
			</v-chip>
		</portal>

		<portal
			to="chrome-window-info"
			v-if="version.app"
		>
			<span class="caption mt-1 d-flex grey--text text--darken-1">v{{ version.app }}</span>
		</portal>

		<v-dialog v-model="dialog" persistent max-width="900px">
			<v-card>
				<v-card-title class="headline">About</v-card-title>
				<v-card-text>
					<p>Reborn of vintel.</p>
					<p>
						All Eve Related Materials are Property Of CCP Games.
						<br>
						Карты регионов скачиваются с сайта <a @click.prevent.stop="openExternal('https://evemaps.dotlan.net')" href="https://evemaps.dotlan.net">https://evemaps.dotlan.net</a>.
					</p>
					<p>
						Данная программа бесплатна для использования, поставляется как есть, без каких-либо гарантий работы.
						<br>
						Программа не собирает для передачи на сторонние сервера ваши аккаунты и иные данные. В том числе не собираются статистика использования и ошибки.
						<br>
						О замеченных нарушениях
						<a @click.prevent.stop="openExternal('https://community.eveonline.com/support/policies/')" href="https://community.eveonline.com/support/policies/">Eve Online
							Policies</a> просьба немедленно сообщить автору.
						<br>
						О найденных ошибках просьба сообщать автору EVEMail (аккаунт WhoIntel) или по иным каналам.
					</p>

					<donate-text/>

					<p>app: {{ version.app }}<br>
						electron: {{ version.electron }}<br>
						website: <a @click.prevent.stop="openExternal('https://whointel.space/')" href="https://whointel.space/">whointel.space/</a>
					</p>

					<p v-if="status === UPDATE_STATUSES.CHECKING_FOR_UPDATE">
						Checking for update
						<v-progress-circular indeterminate/>
					</p>
					<p v-if="status === UPDATE_STATUSES.UPDATE_NOT_AVAILABLE">update not available</p>
					<p v-if="status === UPDATE_STATUSES.UPDATE_AVAILABLE">
						New version found: {{ newVersion }}, <a @click.prevent.stop="openExternal('https://whointel.space/changelog/')" href="https://whointel.space/changelog/">changelog</a>
						<br>
						<v-btn @click="downloadUpdate">Download</v-btn>
					</p>
					<p v-if="status === UPDATE_STATUSES.UPDATE_DOWNLOADING">
						New version found: {{ newVersion }}
						<br>
						Downloading the update
						<v-progress-circular indeterminate/>
					</p>
					<p v-if="status === UPDATE_STATUSES.UPDATE_DOWNLOADED">
						<v-icon color="green">mdi-check</v-icon>
						New version found: {{ newVersion }}
						<br>
						Update successfully downloaded
						<br>
						<v-btn @click="installUpdateAndQuit">Install now and relaunch</v-btn>
						or install on App closing
					</p>
					<p v-if="status === UPDATE_STATUSES.ERROR">ERROR <br> {{ error }}</p>
				</v-card-text>
				<v-card-actions>
					<v-text-field readonly hide-details value="WhoIntel" label="Donation ISK send to char"/>
					<v-spacer/>
					<v-btn color="green darken-1" text @click="dialog = false">Close</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</div>
</template>

<script lang="ts">
import {Component, Vue, Watch} from "vue-property-decorator"
import events from "@/service/EventBus"
import {ipcRenderer, shell} from "electron"
// eslint-disable-next-line no-unused-vars
import {IUpdateStatus, UPDATE_STATUSES} from "@/types/UpdateStatuses"
import DonateText from "@/components/DonateText.vue"

@Component({
	components: {DonateText}
})
export default class AboutWindow extends Vue {
	dialog = false
	status: UPDATE_STATUSES = UPDATE_STATUSES.UPDATE_NOT_AVAILABLE
	error: any = null
	newVersion: any = null

	UPDATE_STATUSES = UPDATE_STATUSES

	version = {
		app: null,
		electron: null,
		other: {}
	}

	openExternal(link: string) {
		shell.openExternal(link)
	}

	created() {
		events.$on("electron:open:about", () => {
			this.dialog = true
		})
		events.$on("electron:setVersion", this.setVersion)
		events.$on("electron:update", this.setUpdate)
		ipcRenderer.send("getVersion")
		ipcRenderer.send("update:check")
	}

	@Watch("dialog")
	onOpen() {
		ipcRenderer.send("update:check")
	}

	installUpdateAndQuit() {
		ipcRenderer.send("update:install")
	}

	downloadUpdate() {
		ipcRenderer.send("update:download")
	}

	setVersion(sender, version: any) {
		this.version.app = version.app
		this.version.electron = version.electron.electron
		this.version.other = version.electron
	}

	setUpdate(sender, update: IUpdateStatus) {
		this.status = update.status
		if (update.data.error) this.error = update.data.error
		if (update.data.version) this.newVersion = update.data.version
	}
}
</script>
