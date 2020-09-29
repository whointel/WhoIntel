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
			<v-list-item-action>
				<div>
					<span class="green--text text--darken-3 caption mr-2" v-if="item.auth.isAuthed">game auth</span>
					<span class="grey--text caption" v-if="item.location">{{ item.location.name }}</span>
				</div>
			</v-list-item-action>
		</template>

		<template v-slot:selection="{ item }">
			<div>
				{{ item.name }}
				<span v-if="item.auth.isAuthed" class="green--text text--darken-3 caption">game auth</span>
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
import characterManager from "@/service/CharacterManager"
import Character from "@/lib/Character"

@Component
export default class AuthBtnCharacterList extends Vue {
	get characters(): Character[] {
		return Object.values(characterManager.characters) as Character[]
	}

	get activeCharacter(): Character | null {
		return characterManager.activeCharacter as Character
	}

	set activeCharacter(character: Character | null) {
		characterManager.setActiveCharacter(character!.name)
	}
}
</script>
