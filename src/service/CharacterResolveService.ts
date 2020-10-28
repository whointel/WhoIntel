import db, {ICharacterExport} from "@/service/Database"
import api from "@/lib/EVEApi"
import isAfter from "date-fns/isAfter"
import subDays from "date-fns/subDays"
import addHours from "date-fns/addHours"
import * as log from "electron-log"

class CharacterResolveService {
	constructor() {
		setInterval(() => this.clearDB.bind(this), 60 * 60 * 1000 /* 1 hour */)
	}

	async clearDB() {
		log.info("CharacterResolveService: Cleanup starting")
		const database = await db()

		const result = await database.getAllKeysFromIndex(
			"characters",
			"expires",
			IDBKeyRange.upperBound(subDays(new Date, 3))
		)
		await Promise.all(result.map(id => database.delete("characters", id)))
		log.info("CharacterResolveService: Cleanup end: deleted cnt:", result.length)
	}

	async deleteCharacter(character_id: number) {
		const database = await db()

		const result = await database.getAllKeysFromIndex(
			"characters",
			"id",
			character_id
		)
		await Promise.all(result.map(id => database.delete("characters", id)))
	}

	isValidName(name: string): boolean {
		name = name.trim()
		if (name.length < 3 || name.length > 37) return false

		const spaceCnt = CharacterResolveService.countChars(" ", name)
		if (spaceCnt > 2) return false
		if (spaceCnt > 0) {
			const parts = name.split(" ")
			if (parts[parts.length - 1].length > 12) return false
		}

		return !name.match(/[^a-zA-Z0-9\-' ]/)
	}

	private static countChars(char: string, str: string): number {
		let result = 0, i = 0
		for (i; i < str.length; i++) {
			if (str[i] === char) result++
		}

		return result
	}

	async findByName(name: string): Promise<ICharacterExport> {
		const dbChar = await this.dbByName(name)
		if (dbChar) {
			const isExpired = this.isExpired(dbChar.expires)
			if (!isExpired) {
				return dbChar
			}

			// If expired
			try {
				const {data: {character: apiIDs}} = await api.searchCharacter$(name).toPromise()
				if (!apiIDs || apiIDs.length === 0) {
					const dbCharNew: ICharacterExport = {
						id: 0,
						name: name,
						corporation_id: 0,
						expires: addHours(new Date(), 1),
						exists: false,
					}
					await this.dbPut(dbCharNew)

					return dbCharNew
				}

				for (let i = 0; i < apiIDs.length; i++) {
					const {data: apiChar, headers: {expires}} = await api.getCharacter$(apiIDs[i]).toPromise()
					const dbCharNew: ICharacterExport = {
						id: apiIDs[i],
						name: apiChar.name,
						corporation_id: apiChar.corporation_id,
						expires: new Date(expires),
						exists: true,
					}
					await this.dbPut(dbCharNew)

					if (apiChar.name === name) {
						return dbCharNew
					}

					return dbChar
				}

			} catch (e) {
				return dbChar
			}
		}

		try {
			const {data: {character: apiIDs}} = await api.searchCharacter$(name).toPromise()
			if (!apiIDs || apiIDs.length === 0) {
				const dbCharNew: ICharacterExport = {
					id: 0,
					name: name,
					corporation_id: 0,
					expires: addHours(new Date(), 1),
					exists: false,
				}
				await this.dbPut(dbCharNew)

				return dbCharNew
			}

			for (let i = 0; i < apiIDs.length; i++) {
				const {data: apiChar, headers: {expires}} = await api.getCharacter$(apiIDs[i]).toPromise()

				const dbCharNew: ICharacterExport = {
					id: apiIDs[i],
					name: apiChar.name,
					corporation_id: apiChar.corporation_id,
					expires: new Date(expires),
					exists: true,
				}
				await this.dbPut(dbCharNew)

				// API also with strict strip not alphabetic chars, eg search on A'B gets AB and A'B
				if (apiChar.name === name) {
					return dbCharNew
				}
			}
		} catch (e) {
			const dbCharNew: ICharacterExport = {
				id: 0,
				name: name,
				corporation_id: 0,
				expires: addHours(new Date(), 1),
				exists: false,
			}
			await this.dbPut(dbCharNew)

			return dbCharNew
		}

		const dbCharNew: ICharacterExport = {
			id: 0,
			name: name,
			corporation_id: 0,
			expires: addHours(new Date(), 1),
			exists: false,
		}
		await this.dbPut(dbCharNew)

		return dbCharNew
	}

	async findById(id: number): Promise<ICharacterExport> {
		const dbChar = await this.dbById(id)
		if (dbChar) {
			const isExpired = this.isExpired(dbChar.expires)
			if (!isExpired) {
				return dbChar
			}

			// If expired
			try {
				const {data: apiChar, headers: {expires}} = await api.getCharacter$(id).toPromise()

				const dbCharNew: ICharacterExport = {
					id: id,
					name: apiChar.name,
					corporation_id: apiChar.corporation_id,
					expires: new Date(expires),
					exists: true,
				}
				await this.dbPut(dbCharNew)

				return dbCharNew
			} catch (e) {
				return dbChar
			}
		}

		try {
			const {data: apiChar, headers: {expires}} = await api.getCharacter$(id).toPromise()
			const dbCharNew: ICharacterExport = {
				id: id,
				name: apiChar.name,
				corporation_id: apiChar.corporation_id,
				expires: new Date(expires),
				exists: true,
			}
			await this.dbPut(dbCharNew)

			return dbCharNew
		} catch (e) {
			const dbCharNew: ICharacterExport = {
				id: id,
				name: "",
				corporation_id: 0,
				expires: addHours(new Date(), 1),
				exists: false,
			}
			await this.dbPut(dbCharNew)

			return dbCharNew
		}
	}

	private async dbPut(character: ICharacterExport) {
		const database = await db()
		await this.deleteCharacter(character.id)
		return database.put("characters", character)
	}

	private async dbById(id: number): Promise<ICharacterExport | undefined> {
		const database = await db()
		return database.getFromIndex("characters", "id", id)
	}

	private async dbByName(name: string): Promise<ICharacterExport | undefined> {
		const database = await db()
		return database.getFromIndex("characters", "name", name)
	}

	private isExpired(expires_at: Date | number): boolean {
		return isAfter(new Date(), expires_at)
	}

}

const characterResolveService = new CharacterResolveService()

export default characterResolveService
