import EVESystem from "@/lib/EVESystem"
import api from "@/lib/EVEApi"
import systemManager from "@/service/SystemManager"
import db from "@/service/Database"
import isAfter from "date-fns/isAfter"
import {API_STRUCTURE} from "@/types/API"

export enum EVE_JUMP_BRIDE_STATUS {
	NEW = "NEW",
	API_FOUND = "API_FOUND",
	API_UNAVAILABLE = "API_UNAVAILABLE",
	API_NOT_FOUND = "API_NOT_FOUND",
	API_FORBIDDEN = "API_FORBIDDEN",
	API_ERROR = "API_ERROR",
	API_WRONG_STRUCTURE = "API_WRONG_STRUCTURE",
}

export const enum JB_DIRECTION_DIRECTION {
	TO_LEFT,
	TO_RIGHT,
	TO_BOTH,
}

export interface IEVEJumpBrideExport {
	structure_id: number
	name: string
	status: EVE_JUMP_BRIDE_STATUS
	expires: Date

	systemFromId: number
	systemToId: number
}

export default class EVEJumpBride implements IEVEJumpBrideExport {
	structure_id: number
	name = ""
	status: EVE_JUMP_BRIDE_STATUS = EVE_JUMP_BRIDE_STATUS.NEW
	systemFromId: number = 0
	systemToId: number = 0
	expires: Date

	constructor(structure_id: number) {
		if (structure_id <= 0) throw new Error(`wrong structure_id: ${structure_id}`)
		this.structure_id = structure_id
		this.expires = new Date()
	}

	// need to notify systemManager
	async save() {
		await (await db()).put("jb", {
			structure_id: this.structure_id,
			name: this.name,
			status: this.status,
			systemFromId: this.systemFromId,
			systemToId: this.systemToId,
			expires: this.expires,
		})
		systemManager.updateJB(this)
	}

	// used only from systemManager - do not need to notify it
	async delete() {
		await (await db()).delete("jb", this.structure_id)
	}

	async syncAPI() {
		if (!this.isExpired()) return

		let structure: API_STRUCTURE
		let expires: string
		try {
			({data: structure, headers: {expires}} = await api.getStructure$(this.structure_id)
				.toPromise())
		} catch (error) {
			this.expires = new Date()

			const code = Number(error.response?.status)
			switch (true) {
				case code === 0:
					this.status = EVE_JUMP_BRIDE_STATUS.API_ERROR
					break
				case code === 403:
					this.status = EVE_JUMP_BRIDE_STATUS.API_FORBIDDEN
					break
				case code === 404:
					this.status = EVE_JUMP_BRIDE_STATUS.API_NOT_FOUND
					break
				case code >= 500 && code <= 504:
					this.status = EVE_JUMP_BRIDE_STATUS.API_UNAVAILABLE
					break
				default:
					this.status = EVE_JUMP_BRIDE_STATUS.API_NOT_FOUND
			}

			await this.save()

			return
		}
		// if (!structure) {
		// 	this.status = EVE_JUMP_BRIDE_STATUS.API_NOT_FOUND
		// 	await this.save()
		// 	systemManager.updateJB(this)
		// 	return
		// }

		this.expires = new Date(expires)

		if (structure.type_id !== 35841) {
			this.status = EVE_JUMP_BRIDE_STATUS.API_WRONG_STRUCTURE
			await this.save()
			return
		}

		this.name = structure.name

		// this.systemFrom = systemManager.getSystemById(structure.solar_system_id) || {}
		const systemFrom = systemManager.getSystemById(structure.solar_system_id)
		this.systemFromId = systemFrom?.id || 0

		const parts = this.name.split(" ")
		// this.systemTo = systemManager.getSystemByName(parts[2]) || {}
		const systemTo = systemManager.getSystemByName(parts[2])
		this.systemToId = systemTo?.id || 0

		this.status = EVE_JUMP_BRIDE_STATUS.API_FOUND

		await this.save()
	}

	isExpired(): boolean {
		return isAfter(new Date(), this.expires)
	}

	get systemFrom(): EVESystem | null {
		return systemManager.getSystemById(this.systemFromId)
	}

	get systemTo(): EVESystem | null {
		return systemManager.getSystemById(this.systemToId)
	}
}
