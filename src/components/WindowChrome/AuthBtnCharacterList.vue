<template>
	<v-select
		:items="characters"
		label="Основной персонаж"
		item-text="name"
		return-object dense
		v-model="activeCharacter"
	>
		<template v-slot:item="{ item }">
			<v-list-item-content>
				<v-list-item-title>
					{{ item.name }}
				</v-list-item-title>
			</v-list-item-content>
			<v-list-item-action v-if="item.isAuthed">
				<span class="green--text text--darken-3 caption">game auth</span>
			</v-list-item-action>
		</template>

		<template v-slot:selection="{ item }">
			<div>{{ item.name }}
				<span v-if="item.isAuthed" class="green--text text--darken-3 caption">game auth</span>
			</div>
		</template>

		<template v-slot:append-outer>
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
					Только для "основного персонажа":<br>
					- настройка "Автоматическая смена региона при перемещении персонажа" <br>
					- оповещения о тревоге<br>
				</span>
			</v-tooltip>
		</template>

	</v-select>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
// eslint-disable-next-line no-unused-vars
import characterManager, {ICharacterManagerCharacter} from "@/service/CharacterManager"

@Component
export default class AuthBtnCharacterList extends Vue {
	get characters(): ICharacterManagerCharacter[] {
		return Object.values(characterManager.characters)
	}

	created() {
		console.debug(characterManager.characters)
	}

	get activeCharacter(): ICharacterManagerCharacter | null {
		return characterManager.activeCharacter
	}

	set activeCharacter(character: ICharacterManagerCharacter | null) {
		characterManager.setActiveCharacter(character!.name)
	}
}
</script>
