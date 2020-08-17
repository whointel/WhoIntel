<template>
	<v-snackbar
		v-model="snackbar"
		:color="status"
		:timeout="timeout"
		app top right
	>
		<v-row v-if="isProcess">
			<v-progress-circular
				indeterminate
				color="green"
			/>
			<p class="text--primary ml-2">ESI request progress</p>
		</v-row>

		<div v-if="isOk">
			ESI ok
		</div>
		<div v-if="isError">
			{{ api_error }}
		</div>

		<template v-slot:action="{ attrs }">
			<v-icon
				v-bind="attrs"
				@click="close"
				color="white"
			>mdi-close
			</v-icon>
		</template>
	</v-snackbar>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import events from "@/service/EventBus"
// eslint-disable-next-line no-undef,no-unused-vars
import Timeout = NodeJS.Timeout

enum API_POPUP_STATUS_COLOR {
	// eslint-disable-next-line no-unused-vars
	PROCESS = "orange",
	// eslint-disable-next-line no-unused-vars
	OK = "success",
	// eslint-disable-next-line no-unused-vars
	ERROR = "error",
}

@Component
export default class ApiPopup extends Vue {
	snackbar = false
	api_error: any = null
	timeout: number = -1
	status: API_POPUP_STATUS_COLOR = API_POPUP_STATUS_COLOR.OK
	process_timer: Timeout | null = null

	get isError(): boolean {
		return this.status === API_POPUP_STATUS_COLOR.ERROR
	}

	get isOk(): boolean {
		return this.status === API_POPUP_STATUS_COLOR.OK
	}

	get isProcess(): boolean {
		return this.status === API_POPUP_STATUS_COLOR.PROCESS
	}

	created() {
		events.$on("api:start", this.apiStart)
		events.$on("api:end", this.apiEnd)
	}

	apiStart() {
		this.status = API_POPUP_STATUS_COLOR.PROCESS
		this.snackbar = false
		if (this.process_timer) {
			clearTimeout(this.process_timer)
		}
		this.process_timer = setTimeout(this.processTimeout.bind(this), 500)
	}

	apiEnd(error: any) {
		if (this.process_timer) {
			clearTimeout(this.process_timer)
		}
		if (error) {
			this.status = API_POPUP_STATUS_COLOR.ERROR
			this.snackbar = true
			this.timeout = 10000
			this.api_error = error
		} else {
			this.status = API_POPUP_STATUS_COLOR.OK
			this.snackbar = true
			this.timeout = 2000
		}
	}

	processTimeout() {
		this.snackbar = true
		this.timeout = -1
	}

	close() {
		this.snackbar = false
	}
}
</script>
