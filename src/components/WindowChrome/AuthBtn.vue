<template>
	<div>
		<v-menu
			offset-y
			:close-on-content-click="false"
			max-width="350px"
			min-width="350px"
			v-model="menu"
		>
			<template v-slot:activator="{ on, attrs }">
				<v-chip
					x-small outlined label
					:color="chipColor"
					v-bind="attrs"
					v-on="on"
				>
					{{ btnTitleCurrentCharacterName }}
				</v-chip>
			</template>

			<v-card v-if="!activeCharacter">
				<v-card-text>
					<auth-btn-character-list/>
				</v-card-text>

				<v-card-text>
					Авторизация через игру позволит отправлять маршрут, получать информацию о пролинкованных игроках, искать актуальные мосты (Jump Bridge).
				</v-card-text>

				<v-card-actions>
					<v-spacer/>
					<v-btn color="green" text @click="loginNew">Авторизоваться</v-btn>
				</v-card-actions>
			</v-card>

			<v-card v-else-if="!isAuthed">
				<v-card-text>
					<auth-btn-character-list/>
				</v-card-text>

				<span class="ml-2">НЕТ Авторизации через игру</span>
				<v-card-title>
					{{ activeCharacter.name }}
				</v-card-title>

				<v-card-text v-if="activeCharacter && activeCharacter.auth.authError">
					<v-alert
						border="left"
						colored-border
						type="warning"
						elevation="2"
					>
						Ошибка авторизации:<br>
						{{ activeCharacter.auth.authError }}
					</v-alert>
				</v-card-text>

				<v-card-text>
					Авторизация через игру позволит отправлять маршрут, получать информацию о пролинкованных игроках, искать актуальные мосты (Jump Bridge).
				</v-card-text>

				<v-card-actions>
					<v-spacer/>
					<v-btn color="green" text @click="login">Авторизоваться</v-btn>
				</v-card-actions>
			</v-card>

			<v-card v-else>
				<v-card-text>
					<auth-btn-character-list/>
				</v-card-text>

				<span class="ml-2">Авторизация через игру</span>
				<v-card-title>
					{{ activeCharacter.name }}
				</v-card-title>

				<v-card-text>
					<v-row>
						<v-col cols="4">
							<v-img
								v-if="ship"
								:src="`https://images.evetech.net/characters/${activeCharacter.auth.character_id}/portrait?size=64`"
								:height="64"
								:width="64"
							/>
						</v-col>
						<v-col cols="4" v-if="character">
							<v-img
								v-if="ship"
								:src="`https://images.evetech.net/corporations/${character.corporation_id}/logo?size=64`"
								:height="64"
								:width="64"
							/>
						</v-col>
						<v-col cols="4">
							<v-img
								v-if="ship"
								:src="`https://images.evetech.net/types/${ship.ship_type_id}/icon`"
								:height="64"
								:width="64"
							/>
						</v-col>
					</v-row>
					<v-row>
						<v-col :cols="4">
							<span v-if="ship">{{ ship.ship_name }}</span>
							<br>
							<a @click.prevent="setLocationToCurrent" v-if="location && location.system">{{ location.system.name }}</a>
						</v-col>

						<v-col v-if="online">
							<h3>{{ online.online ? "online" : "offline" }}</h3>
							login: {{ last_login }}<br>
							logout: {{ last_logout }}<br>
							times login: {{ online.logins }}<br>
						</v-col>
					</v-row>

					<v-alert
						border="left"
						colored-border
						type="warning"
						elevation="2"
						v-if="activeCharacter && activeCharacter.auth.authError"
					>
						Ошибка авторизации:<br>
						{{ activeCharacter.auth.authError }}
					</v-alert>

				</v-card-text>

				<v-card-actions>
					<v-btn color="green" text @click="loginNew">Добавить</v-btn>
					<v-spacer/>
					<v-btn color="red" text @click="logout">Logout</v-btn>
				</v-card-actions>
			</v-card>
		</v-menu>

	</div>
</template>

<script lang="ts">
import {Component, Vue, Watch} from "vue-property-decorator"
import parseJSONDate from "date-fns/parseJSON"
import format from "date-fns/format"
import {apiPoll} from "@/lib/EVEApi"
import {Subscription} from "rxjs"
import {API_CHARACTER_LOCATION, API_CHARACTER_ONLINE, API_CHARACTER_SHIP} from "@/types/API"
import systemManager from "@/service/SystemManager"
import EVESystem from "@/lib/EVESystem"
import characterResolveService from "@/service/CharacterResolveService"
import {ICharacterExport} from "@/service/Database"
import AuthBtnCharacterList from "@/components/WindowChrome/AuthBtnCharacterList.vue"
import characterManager from "@/service/CharacterManager"
import Character from "@/lib/Character"
import {reactive} from "@vue/composition-api"

@Component({
	components: {AuthBtnCharacterList}
})
export default class AuthBtn extends Vue {
	menu = false
	character: ICharacterExport | null = null

	online: API_CHARACTER_ONLINE | null = null
	online$: Subscription | null = null
	ship: API_CHARACTER_SHIP | null = null
	ship$: Subscription | null = null
	location: API_CHARACTER_LOCATION & { system: EVESystem | null } | null = null
	location$: Subscription | null = null

	get activeCharacter(): Character | null {
		return characterManager.activeCharacter as Character
	}

	get btnTitleCurrentCharacterName(): string {
		return this.activeCharacter ? this.activeCharacter.name : "нет активного"
	}

	get isAuthed(): boolean {
		return this.activeCharacter?.auth.isAuthed || false
	}

	get last_login() {
		if (!this.online?.last_login) return ""

		return format(parseJSONDate(this.online.last_login), "uuuu.MM.dd HH:mm:ss")
	}

	get last_logout() {
		if (!this.online?.last_logout) return ""

		return format(parseJSONDate(this.online.last_logout), "uuuu.MM.dd HH:mm:ss")
	}

	get chipColor(): string {
		if (!this.isAuthed) return "red"

		return (this.online && this.online.online) ? "green" : "orange"
	}

	subscribeCharacter(character: Character | null) {
		if (!character) return

		this.online$ = apiPoll(
			character.character_online$(),
			{name: `character_online:${character.name}`}
		).subscribe(
			online => this.online = online
		)

		this.ship$ = apiPoll(
			character.character_ship$(),
			{name: "character_ship", interval: 60_000}
		).subscribe(
			ship => this.ship = ship
		)

		this.location$ = apiPoll(
			character.character_location$(),
			{name: `character_location:${character.name}`, interval: 30_000}
		).subscribe(
			location => {
				this.location = Object.assign({}, location, location ? {
					system: systemManager.getSystemById(location.solar_system_id)
				} : {system: null})
			}
		)
	}

	unsubscribeCharacter() {
		if (this.online$) {
			this.online$.unsubscribe()
			this.online$ = null
			this.online = null
		}
		if (this.ship$) {
			this.ship$.unsubscribe()
			this.ship$ = null
			this.ship = null
		}
		if (this.location$) {
			this.location$.unsubscribe()
			this.location$ = null
			this.location = null
		}
	}

	@Watch("activeCharacter", {immediate: true})
	async characterWatcher(character: Character | null) {
		this.unsubscribeCharacter()
		if (!character || !character.auth.isAuthed) {
			this.character = null
			return
		}

		this.subscribeCharacter(character)
	}

	@Watch("isAuthed", {immediate: true})
	async characterAuthWatcher(isAuthed: boolean) {
		if (isAuthed) {
			this.subscribeCharacter(this.activeCharacter)
			this.character = await characterResolveService.findById(this.activeCharacter!.auth.character_id!)
		} else {
			this.unsubscribeCharacter()
			this.character = null
		}
	}

	async login() {
		this.activeCharacter?.login()
	}

	logout() {
		this.menu = false
		this.activeCharacter?.logout()
	}

	async loginNew() {
		const character = reactive(new Character("[authenticating]")) as Character
		await character.login()
		characterManager.addCharacter(character)
		characterManager.setActiveCharacter(character.name)
	}

	setLocationToCurrent() {
		if (!this.location?.system) return

		systemManager.markSystem(this.location.system)
	}

	beforeDestroy() {
		this.unsubscribeCharacter()
	}
}
</script>
