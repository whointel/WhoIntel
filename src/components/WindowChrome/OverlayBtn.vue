<template>
	<div v-if="settings.showOverlayBtn">

		<v-menu
			offset-y
			:close-on-content-click="false"
			v-model="menu"
		>
			<template v-slot:activator="{ on, attrs }">
				<v-chip
					x-small :color="color" outlined label
					v-bind="attrs"
					v-on="on"
				>
					{{ overlay === OVERLAY_TYPE.ALERT ? $t("overlays") : overlay }}
				</v-chip>
			</template>

			<v-card>
				<v-card-text>

					<v-chip
						label color="grey" class="mx-1"
						:outlined="overlay !== OVERLAY_TYPE.ALERT"
						@click="setOverlay(OVERLAY_TYPE.ALERT)"
					>alert
					</v-chip>

					<v-chip
						label color="red" class="mx-1"
						:outlined="overlay !== OVERLAY_TYPE.KILLS"
						@click="setOverlay(OVERLAY_TYPE.KILLS)"
					>kill
					</v-chip>

					<v-chip
						label color="blue" class="mx-1"
						:outlined="overlay !== OVERLAY_TYPE.JUMPS"
						@click="setOverlay(OVERLAY_TYPE.JUMPS)"
					>jump
					</v-chip>

					<v-chip
						label color="green" class="mx-1"
						:outlined="overlay !== OVERLAY_TYPE.NPC_KILLS"
						@click="setOverlay(OVERLAY_TYPE.NPC_KILLS)"
					>npc kill
					</v-chip>

				</v-card-text>
			</v-card>
		</v-menu>

	</div>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import systemManager from "@/service/SystemManager"
import {OVERLAY_TYPE} from "@/types/MAP"
import settingsService from "@/service/settings"

const OVERLAY_TYPE_COLOR = {
	[OVERLAY_TYPE.ALERT]: "grey",
	[OVERLAY_TYPE.KILLS]: "red",
	[OVERLAY_TYPE.JUMPS]: "blue",
	[OVERLAY_TYPE.NPC_KILLS]: "green",
}

@Component
export default class OverlayBtn extends Vue {
	menu = false
	OVERLAY_TYPE = OVERLAY_TYPE

	get overlay() {
		return this.$store.getters.overlay
	}

	get color() {
		return OVERLAY_TYPE_COLOR[this.overlay]
	}

	get settings() {
		return settingsService.$
	}

	setOverlay(overlay: OVERLAY_TYPE) {
		systemManager.showRegion(overlay)
	}
}
</script>

<i18n>
{
	"en": {
		"overlays": "overlays"
	},
	"ru": {
		"overlays": "слои"
	}
}
</i18n>
