import EVESystem from "@/lib/EVESystem"
import settingsService from "@/service/settings"
import systemManager from "@/service/SystemManager"
import {reactive} from "@vue/composition-api"
import Vue from "vue"
import Character from "@/lib/Character"
import db from "@/service/Database"

class CharacterManager {
	characters: { [characterName: string]: Character } = {}

	activeCharacter: Character | null = null

	regionSystemToChars: {
		[regionID: number]: {
			[systemID: number]: Character[]
		}
	} = {}

	async init() {
		const auths = await (await db()).getAll("auth")
		auths.forEach(auth => {
			const character = reactive(new Character(auth.token.name)) as Character
			character.setTokens(auth)
			Vue.set(this.characters, character.name, character)
			if (!this.activeCharacter) {
				this.activeCharacter = character
			}
		})
	}

	public addCharacter(character: Character) {
		Vue.set(this.characters, character.name, character)
	}

	public async setActiveCharacter(name: string) {
		this.activeCharacter = this.findCreateCharacter(name)

		const system = this.activeCharacter.location
		if (
			system
			&& systemManager.currentRegion
			&& (
				system.region_id !== systemManager.currentRegion.id
				&& !system.neighbourRegions.includes(systemManager.currentRegion.id)
			)
		) {
			await systemManager.setCurrentRegion(system.region_id)
		}
	}

	findCharacter(name: string): Character | null {
		return this.characters[name]
	}

	findCreateCharacter(name: string): Character {
		let character = this.findCharacter(name)
		if (!character) {
			character = Object.preventExtensions(new Character(name))
			Vue.set(this.characters, name, character)
		}

		return character
	}

	public async setLocation(characterName: string, system: EVESystem) {
		if (!system) return

		if (!this.activeCharacter) this.setActiveCharacter(characterName)
		const character = this.findCreateCharacter(characterName)

		if (character.location) {
			const regionToCharacter = this.regionSystemToChars[character.location.region_id]
			if (regionToCharacter) {
				const systemToCharacter = regionToCharacter[character.location.id]
				if (systemToCharacter && systemToCharacter.length) {
					const index = systemToCharacter.findIndex(char => char === character)
					if (index >= 0) {
						systemToCharacter.splice(index, 1)
					}
				}
			}
		}

		character.location = system

		if (!this.regionSystemToChars[system.region_id]) {
			Vue.set(this.regionSystemToChars, system.region_id, {})
		}
		if (!this.regionSystemToChars[system.region_id][system.id]) {
			Vue.set(this.regionSystemToChars[system.region_id], system.id, [])
		}
		this.regionSystemToChars[system.region_id][system.id].push(character)

		if (this.activeCharacter!.name !== characterName) return

		if (
			systemManager.currentRegion
			&&
			(
				system.region_id === systemManager.currentRegion.id
				|| system.neighbourRegions.includes(systemManager.currentRegion.id)
			)
		) {
			// nothing to do
		} else if (
			settingsService.$.followCharacterRegion
		) {
			await systemManager.setCurrentRegion(system.region_id)
		}
	}

	getCurrentSystem(): EVESystem | null {
		if (!this.activeCharacter) {
			return null
		}

		return this.activeCharacter.location
	}
}

const characterManager = reactive(new CharacterManager())

export default characterManager
