<template>
	<v-card-text>
		<v-alert
			border="left"
			colored-border
			type="info"
			elevation="2"
		>
			По нажатию одной кнопки открыть в отдельных окнах адреса из списка.
		</v-alert>
		<v-data-table
			:items="settings.externalURLs"
			:headers="headers"
		>
			<template v-slot:no-data>
				<h3 class="red--text">No urls</h3>
			</template>
			<template v-slot:item.actions="{ item }">
				<v-btn icon @click="deleteURL(item)">
					<v-icon color="red">mdi-close</v-icon>
				</v-btn>
			</template>
		</v-data-table>

		<v-row>
			<v-col>
				<v-text-field
					clearable outlined
					label="Add new url"
					:rules="[rules.required, rules.min, rules.urlLike]"
					v-model="newURL"
					@update:error="newURLError = $event"
				/>
			</v-col>
			<v-col>
				<v-btn
					@click="addURL"
					:disabled="newURLError"
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

@Component
export default class ExtWinConfig extends Vue {
	newURL = ""
	newURLError = true
	headers = [
		{
			text: 'url',
			align: 'start',
			sortable: true,
			value: 'url',
		},
		{text: 'actions', value: 'actions', sortable: false, align: "end"},
	]

	get settings() {
		return settingsService.$
	}

	rules = {
		required: value => !!value || 'Required.',
		min: v => v.length >= 3 || 'Min 3 characters',
		urlLike: this.isNewURLValid,
	}

	isNewURLValid(val: string): any {
		if (
			!val.startsWith("http://")
			&& !val.startsWith("https://")
		) return "start with http:// or https://"

		try {
			new URL(val)
			return true
			// eslint-disable-next-line no-empty
		} catch (e) {
			return "not url"
		}
	}

	addURL() {
		this.settings.externalURLs.push({
			url: this.newURL.trim(),
		})
		this.newURL = ""
	}

	deleteURL(item) {
		const index = findIndex(this.settings.externalURLs, item)
		if (index >= 0) {
			this.settings.externalURLs.splice(index, 1)
		}
	}

}
</script>
