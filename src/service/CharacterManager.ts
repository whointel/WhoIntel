import EVESystem from "@/lib/EVESystem"
import events from "@/service/EventBus"
import settingsService from "@/service/settings"
import systemManager from "@/service/SystemManager"
import {watch} from "@vue/composition-api"
import api from "@/lib/EVEApi"
import Vue from "vue"

export interface ICharacterManagerCharacter {
	isAuthed: boolean
	name: string
	system: EVESystem | null
}

class CharacterManager {
	characters: { [characterName: string]: ICharacterManagerCharacter } = {}

	activeCharacter: ICharacterManagerCharacter | null = null

	regionSystemToChars: {
		[regionID: number]: {
			[systemID: number]: Set<string>
		}
	} = {}

	init() {
		watch(() => api.auth.isAuth, (isAuth: boolean) => {
			let isAuthedCharacterFound = false
			for (const [, character] of Object.entries(this.characters)) {
				if (character.isAuthed) character.isAuthed = false
				if (isAuth) {
					const name = api.auth.token?.name
					if (name && character.name === name) {
						character.isAuthed = true
						isAuthedCharacterFound = true
					}
				}
			}
			if (isAuth && !isAuthedCharacterFound) {
				const name = api.auth.token?.name
				if (!name) return
				Vue.set(this.characters, name, {
					name: name,
					isAuthed: true,
				})
				if (!this.activeCharacter) this.setActiveCharacter(name)
			}
		}, {immediate: true})
	}

	public async setActiveCharacter(name: string) {
		this.activeCharacter = this.findCreateCharacter(name)

		const system = this.activeCharacter.system
		if (
			system
			&& systemManager.currentRegion
			&& (
				system.region_id !== systemManager.currentRegion.id
				&& !system.neighbourRegions.includes(systemManager.currentRegion.id)
			)
		) {
			await systemManager.setCurrentRegion(system.region_id)
		} else {
			this.sendUpdateNotification()
		}
	}

	// public deleteCharacter(uuid: string) {
	//
	// }

	findCreateCharacter(name: string): ICharacterManagerCharacter {
		let character = this.characters[name]
		if (!character) {
			character = {
				name: name,
				isAuthed: false,
				system: null,
			}
			Vue.set(this.characters, name, character)
		}
		return character
	}

	public async setLocation(characterName: string, system: EVESystem) {
		if (!system) return

		if (!this.activeCharacter) this.setActiveCharacter(characterName)
		const character = this.findCreateCharacter(characterName)

		if (character.system) {
			this.regionSystemToChars[
				character.system.region_id
				]?.[character.system.id]?.delete(characterName)
		}
		character.system = system

		if (!this.regionSystemToChars[system.region_id]) {
			this.regionSystemToChars[system.region_id] = {}
		}
		if (!this.regionSystemToChars[system.region_id][system.id]) {
			this.regionSystemToChars[system.region_id][system.id] = new Set<string>()
		}
		this.regionSystemToChars[system.region_id][system.id].add(characterName)

		if (this.activeCharacter!.name === characterName) {
			if (
				systemManager.currentRegion
				&&
				(
					system.region_id === systemManager.currentRegion.id
					|| system.neighbourRegions.includes(systemManager.currentRegion.id)
				)
			) {
				this.sendUpdateNotification()
			} else if (
				settingsService.$.followCharacterRegion
			) {
				await systemManager.setCurrentRegion(system.region_id)
			} else {
				this.sendUpdateNotification()
			}
		} else {
			this.sendUpdateNotification()
		}
	}

	getCurrentSystem(): EVESystem | null {
		if (!this.activeCharacter) {
			return null
		}

		return this.activeCharacter.system
	}

	private sendUpdateNotification() {
		events.$emit("updateLocationMarker")
	}
}

const characterManager = Vue.observable(new CharacterManager())

export default characterManager
