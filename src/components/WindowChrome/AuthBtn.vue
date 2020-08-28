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
					{{ chipText }}
				</v-chip>
			</template>

			<v-card v-if="!isAuth">
				<v-card-text>
					<auth-btn-character-list/>
				</v-card-text>

				<v-card-text v-if="api.auth.authError">
					<v-alert
						border="left"
						colored-border
						type="warning"
						elevation="2"
					>
						Ошибка авторизации:<br>
						{{ api.auth.authError }}
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

			<v-card v-if="isAuth">
				<v-card-text>
					<auth-btn-character-list/>
				</v-card-text>

				<span class="ml-2">Авторизация через игру</span>
				<v-card-title>
					{{ api.auth.token.name }}
				</v-card-title>

				<v-card-text>
					<v-row>
						<v-col cols="4">
							<v-img
								v-if="ship"
								:src="`https://images.evetech.net/characters/${api.auth.character_id}/portrait?size=64`"
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
							<span v-if="location">{{ location.system ? location.system.name : '' }}</span>
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
						v-if="api.auth.authError"
					>
						Ошибка авторизации:<br>
						{{ api.auth.authError }}
					</v-alert>

				</v-card-text>

				<v-card-actions>
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
import api, {apiPoll} from "@/lib/EVEApi"
// eslint-disable-next-line no-unused-vars
import {Subscription} from "rxjs"
// eslint-disable-next-line no-unused-vars
import {API_CHARACTER_LOCATION, API_CHARACTER_ONLINE, API_CHARACTER_SHIP} from "@/types/API"
import systemManager from "@/service/SystemManager"
// eslint-disable-next-line no-unused-vars
import EVESystem from "@/lib/EVESystem"
import characterResolveService from "@/service/CharacterResolveService"
// eslint-disable-next-line no-unused-vars
import {ICharacterExport} from "@/service/Database"
import AuthBtnCharacterList from "@/components/WindowChrome/AuthBtnCharacterList.vue"
// eslint-disable-next-line no-unused-vars
import characterManager, {ICharacterManagerCharacter} from "@/service/CharacterManager"

@Component({
	components: {AuthBtnCharacterList}
})
export default class AuthBtn extends Vue {
	menu = false

	// menu = true

	get api() {
		return api
	}

	get chipText(): string {
		if (
			characterManager.activeCharacter
			&& api.auth.isAuth
			&& characterManager.activeCharacter.name === api.auth.token?.name) {
			return characterManager.activeCharacter.name
		}

		return `
		${this.activeCharacter ? this.activeCharacter.name : "нет активного"}
		/ ${this.isAuth ? api.auth.token?.name : "не авторизован"}
		`
	}

	get activeCharacter(): ICharacterManagerCharacter | null {
		return characterManager.activeCharacter
	}

	get isAuth(): boolean {
		return api.auth.isAuth
	}

	get last_login() {
		if (!this.online?.last_login) return ''

		return format(parseJSONDate(this.online.last_login), "uuuu.MM.dd HH:mm:ss")
	}

	get last_logout() {
		if (!this.online?.last_logout) return ''

		return format(parseJSONDate(this.online.last_logout), "uuuu.MM.dd HH:mm:ss")
	}

	character: ICharacterExport | null = null

	@Watch("api.auth.character_id", {immediate: true})
	async characterWatcher(id: number) {
		if (!id) {
			this.character = null
			return
		}

		this.character = await characterResolveService.findById(id)
	}

	get chipColor(): string {
		if (!this.isAuth) return "red"

		return (this.online && this.online.online) ? "green" : "orange"
	}

	online: API_CHARACTER_ONLINE | null = null
	online$: Subscription | null = null
	ship: API_CHARACTER_SHIP | null = null
	ship$: Subscription | null = null
	location: API_CHARACTER_LOCATION & { system: EVESystem | null } | null = null
	location$: Subscription | null = null

	unsubscribeAll() {
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

	beforeDestroy() {
		this.unsubscribeAll()
	}

	@Watch("isAuth", {immediate: true})
	authChangeHandler(val) {
		if (val) {
			this.unsubscribeAll()

			this.online$ = apiPoll(
				api.character_online$(),
				{name: "character_online"}
			).subscribe(
				online => this.online = online
			)

			this.ship$ = apiPoll(
				api.character_ship$(),
				{name: "character_ship", interval: 60_000}
			).subscribe(
				ship => this.ship = ship
			)

			this.location$ = apiPoll(
				api.character_location$(),
				{name: "character_location", interval: 30_000}
			).subscribe(
				location => {
					this.location = Object.assign({}, location, location ? {
						system: systemManager.getSystemById(location.solar_system_id)
					} : {system: null})
				}
			)
		} else {
			this.unsubscribeAll()
		}
	}

	logout() {
		this.menu = false
		api.logout()
	}

	async login() {
		api.login()
	}
}
</script>
