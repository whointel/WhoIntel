<template>
	<v-col cols="2" class="container">
		<p class="pa-5" v-if="!fleet">You are not in a fleet.</p>
		<p class="pa-5" v-if="fleet && !members.length">You are in fleet but not a fleet officer.<br>You can't read the members.</p>
		<v-list dense>
			<v-list-item
				v-for="(member, index) in members" :key="index"
				@click="markSystem(member)"
			>
				<v-list-item-content>
					<v-list-item-title>
						<b v-if="member.solar_system_id !== mySystemId">{{ member.system.name }}</b>
						{{ member.character ? member.character.name : member.character_id }}
					</v-list-item-title>
					<v-list-item-subtitle>{{ member.role_name }}</v-list-item-subtitle>
				</v-list-item-content>
				<v-list-item-icon v-if="member.role === API_FLEET_MEMBER_ROLE.FLEET_COMMANDER">
					<v-icon small color="orange">mdi-crown</v-icon>
				</v-list-item-icon>
				<v-list-item-icon v-if="member.role === API_FLEET_MEMBER_ROLE.SQUAD_COMMANDER || member.role === API_FLEET_MEMBER_ROLE.WING_COMMANDER">
					<v-icon small color="orange">mdi-crown-outline</v-icon>
				</v-list-item-icon>
			</v-list-item>
		</v-list>
	</v-col>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
// eslint-disable-next-line no-undef,no-unused-vars
import Timeout = NodeJS.Timeout
import {API_FLEET, API_FLEET_MEMBER, API_FLEET_MEMBER_ROLE} from "@/types/API"
import characterResolveService from "@/service/CharacterResolveService"
import systemManager from "@/service/SystemManager"
import EVESystem from "@/lib/EVESystem"
import {ICharacterExport} from "@/service/Database"
import characterManager from "@/service/CharacterManager"

interface FLEET_MEMBER extends API_FLEET_MEMBER {
	system: EVESystem
	character: ICharacterExport
}

@Component
export default class Fleet extends Vue {
	timerFleet: Timeout | null = null
	timerMembers: Timeout | null = null
	fleet: API_FLEET | null = null
	members: FLEET_MEMBER[] = []
	mySystemId: number = 0

	API_FLEET_MEMBER_ROLE = API_FLEET_MEMBER_ROLE

	created() {
		this.refreshFleet()
	}

	beforeDestroy() {
		if (this.timerFleet) {
			clearTimeout(this.timerFleet)
		}
		if (this.timerMembers) {
			clearTimeout(this.timerMembers)
		}
	}

	markSystem(member: FLEET_MEMBER) {
		systemManager.markSystem(member.system)
	}

	async refreshFleet() {
		try {
			const {data: fleet} = (await characterManager.activeCharacter?.getMyFleet$().toPromise()) || {data: null}
			this.fleet = fleet

			if (!this.fleet) return
			if (!this.timerMembers) {
				this.refreshMembers()
			}
		} catch (e) {
			if (this.timerMembers) {
				clearTimeout(this.timerMembers)
			}
			this.members = []
			this.fleet = null
		}

		this.timerFleet = setTimeout(this.refreshFleet.bind(this), 61_000)
	}

	async refreshMembers() {
		if (!this.fleet) return
		try {
			const {data: fleet_members} = (await characterManager.activeCharacter?.getFleetMembers$(this.fleet.fleet_id).toPromise()) || {data: []}
			const members: FLEET_MEMBER[] = []

			for (let i = 0; i < fleet_members.length; i++) {
				const member = fleet_members[i]
				const character = await characterResolveService.findById(member.character_id)
				if (!character) return

				members.push(Object.assign(member, {
					character: character,
					system: systemManager.getSystemById(member.solar_system_id)!
				}))

				if (member.character_id === characterManager.activeCharacter?.auth.character_id) {
					this.mySystemId = member.solar_system_id
				}
			}

			this.members = members
		} catch (e) {
			this.members = []
		}

		this.timerMembers = setTimeout(this.refreshMembers.bind(this), 6_000)
	}
}
</script>

<style scoped>
.container {
	height: 100%;
	position: relative;
}
</style>
