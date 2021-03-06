import EVESystem from "@/lib/EVESystem"
import db, {IRegionMapExport} from "@/service/Database"
import {ipcRenderer} from "electron"
import settingsService from "@/service/settings"

export const SPECIAL_REGIONS = {
	NEW_EDEN: -1,
}

export default class EVERegion {
	public readonly systems: EVESystem[] = []
	public readonly subscription: EVESystem[] = []
	public readonly neighbourSystems: EVESystem[] = []
	public readonly isSpecial = {
		newEden: false,
	}
	svg: string = ""
	tsUpdate: Date | null = null

	constructor(
		public readonly id: number = 0,
		public readonly name: string = "",
	) {

	}

	get nameDebug(): string {
		return `EVERegion [${this.name} #${this.id}]`
	}

	public static getStoredRegionId(): number {
		return Number(localStorage.getItem("region")) || 0
	}

	private async downloadMap(darkTheme: boolean): Promise<IRegionMapExport> {
		const regionName = this.name.replaceAll(" ", "_")
		const svg = await ipcRenderer.invoke("downloadMap", regionName + (darkTheme ? ".dark" : ""))
		return {
			id: this.id,
			ts: new Date(),
			svg,
		}
	}

	public async loadMap() {
		const database = await db()
		const darkTheme = settingsService.$.darkTheme

		let record = await database.get(darkTheme ? "regionMapDark" : "regionMap", this.id)
		if (record) {
			if (Number(new Date()) - Number(record.ts) > (6 * 60 * 60 * 1000)) {
				record = await this.downloadMap(darkTheme)
				await database.put(darkTheme ? "regionMapDark" : "regionMap", record)
			}
		} else {
			record = await this.downloadMap(darkTheme)
			await database.put(darkTheme ? "regionMapDark" : "regionMap", record)
		}

		this.svg = record.svg
		this.tsUpdate = record.ts
	}

	public storeAsCurrent() {
		localStorage.setItem("region", this.id as unknown as string)
	}

	public hideSystems() {
		this.systems.forEach(system => system.hide())
	}
}
