<template>

	<v-dialog v-model="dialog" persistent :max-width="step1 ? '370px' : '700px'">
		<v-card>
			<v-card-title class="headline"><!--Do you like this program?-->Вам нравится эта программа?</v-card-title>
			<v-card-text class="text-center" v-if="step1">
				<v-row>
					<v-hover v-slot:default="{ hover }">
						<v-card
							@click="doChoose"
							:elevation="hover ? 16 : 2"
							class="mx-auto"
							height="120"
							width="120"
						>
							<v-icon :size="100" color="green darken-2">mdi-thumb-up-outline</v-icon>
						</v-card>
					</v-hover>

					<v-hover v-slot:default="{ hover }">
						<v-card
							@click="doChoose"
							:elevation="hover ? 16 : 2"
							class="mx-auto"
							height="120"
							width="120"
						>
							<v-icon :size="100" color="orange darken-2">mdi-thumb-down-outline</v-icon>
						</v-card>
					</v-hover>
				</v-row>
			</v-card-text>

			<v-card-text v-else>
				<donate-text/>

			</v-card-text>

			<v-card-actions>
				<v-spacer/>
				<v-btn color="green darken-1" text @click="close">Close</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import DonateText from "@/components/DonateText.vue"

@Component({
	components: {DonateText}
})
export default class AboutWindow extends Vue {
	dialog = true
	step1 = true

	doChoose() {
		this.step1 = false
	}

	close() {
		this.dialog = false
		setTimeout(() => this.$emit("close"), 200)
	}
}
</script>
