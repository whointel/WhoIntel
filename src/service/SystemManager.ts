import EVESystem, {MapCoordinates} from "@/lib/EVESystem"
import events, {EventBusEvents} from "@/service/EventBus"
import {ipcRenderer, IpcRendererEvent} from "electron"
import store from "@/store"
import * as log from "electron-log"
import sortBy from "lodash/sortBy"
import find from "lodash/find"
import EVEJumpBridge, {EVE_JUMP_BRIDGE_STATUS} from "@/lib/EVEJumpBridge"
import db from "@/service/Database"
import Vue from "vue"
import findIndex from "lodash/findIndex"
import {OVERLAY_TYPE} from "@/types/RegionMap"
import {API_SYSTEM_JUMPS, API_SYSTEM_KILLS} from "@/types/API"
import {reactive, watch} from "@vue/composition-api"
import EVERegion, {SPECIAL_REGIONS} from "@/lib/EVERegion"

class SystemManager {
	systemsByName: { [key: string]: EVESystem } = Object.preventExtensions({})
	systemsById: { [key: number]: EVESystem } = Object.preventExtensions({})

	regions: { [key: number]: EVERegion } = Object.preventExtensions({})
	currentRegion: EVERegion | null = null

	ShipsDB: string[] = Object.preventExtensions([])

	jb: EVEJumpBridge[] = []
	jbByStructure: { [key: string]: EVEJumpBridge } = {}
	jbBySystemId: { [key: number]: EVEJumpBridge } = {}
	#jbIDtoSystemID: { [key: number]: number } = {}

	constructor() {
		events.$on("electron:setSDE", this.loadSDE.bind(this))
		events.$on("setDarkTheme", () => this.refreshRegionMap())
	}

	public init() {
		ipcRenderer.send("getSDE")
		watch(() => store.getters.overlay, () => {
			this.showRegion()
		})
		setInterval(this.eventLoop.bind(this), 1000)
	}

	private eventLoop() {
		this.currentRegion?.subscription.forEach(system => system.update())
	}

	public subscribeSystemLoop(system: EVESystem) {
		const regions = [system.region_id, ...system.neighbourRegions]
		regions.forEach(region_id => {
			const region = this.regions[region_id]
			if (!region || region.subscription.includes(system)) return

			region.subscription.push(system)
		})
		// console.debug(this.currentRegion?.subscription)
	}

	public unSubscribeSystemLoop(system: EVESystem) {
		const region = this.regions[system.region_id]
		if (!region) return

		const index = findIndex(region.subscription, {id: system.id})
		if (index < 0) return

		region.subscription.splice(index, 1)
	}

	private async loadSDE(event: IpcRendererEvent, {SystemDB, StarGateDB, RegionDB, ShipsDB}) {
		log.info("SystemManager: start loading systems")

		this.ShipsDB = Object.preventExtensions(
			(ShipsDB as string[]).map(val => val.toLowerCase()),
		)

		const regions: { [key: number]: EVERegion } = {}

		Object.entries(RegionDB).map((entry) => {
			const id = Number(entry[0])
			regions[id] = new EVERegion(
				id,
				entry[1] as string,
			)
		})

		sortBy(regions, "name")
		this.regions = Object.preventExtensions(regions)

		const systemsByName = {}
		const systemsById = {}
		SystemDB.forEach((systemData => {
			this.addSystem(
				systemData.name, systemData.id, systemData.regionId, systemData.security,
				systemsByName, systemsById,
			)
		}))
		this.systemsByName = Object.preventExtensions(systemsByName)
		this.systemsById = Object.preventExtensions(systemsById)

		const sgIDS = Object.keys(StarGateDB)
		sgIDS.forEach((StarGateID => {
			const StarGatesData = StarGateDB[StarGateID]
			const dstSG = StarGateDB[StarGatesData.destinationSG]
			if (!dstSG) return
			const system: EVESystem | null = this.getSystemById(StarGatesData.systemId)
			const systemDST: EVESystem | null = this.getSystemById(dstSG.systemId)
			if (!system || !systemDST) return

			system.addNeighbour(systemDST)
			const region = this.regions[system.region_id]
			if (!region) return

			const regionDST = this.regions[systemDST.region_id]
			if (region !== regionDST) {
				region.neighbourSystems.push(systemDST)
			}
		}))

		Vue.nextTick(() => this.initJBs())

		log.info("SystemManager: finish loading systems")
		store.commit("setAppReady")
		events.$emit(EventBusEvents["systemManager:ready"])
		this.unStoreRegion()
	}

	public async refreshRegionMap() {
		if (this.currentRegion) {
			await this.setCurrentRegion(this.currentRegion.id)
		}
	}

	private async initJBs() {
		const jbs = await (await db()).getAll("jb")
		if (jbs) {
			for (let i = 0; i < jbs.length; i++) {
				const jb = await this.addJB(jbs[i].structure_id)
				await this.updateJB(jb, jbs[i])
			}
			log.debug("jb loaded", jbs.length, this.jb.length)
			events.$emit(EventBusEvents["JB:ready"])
			// Vue.nextTick(() => this.refreshRegionMap())
		}
	}

	public updateJB(jb: EVEJumpBridge, value: any = null) {
		const systemFromId = this.#jbIDtoSystemID[jb.structure_id]
		if (systemFromId) {
			delete this.#jbIDtoSystemID[jb.structure_id]
			delete this.jbBySystemId[jb.systemFromId]
		}

		if (value) {
			jb = Object.assign(jb, value)
		}
		if (jb.systemFromId && jb.status === EVE_JUMP_BRIDGE_STATUS.API_FOUND) {
			this.jbBySystemId[jb.systemFromId] = jb
			this.#jbIDtoSystemID[jb.structure_id] = jb.systemFromId
		}
	}

	public async deleteJB(jb: EVEJumpBridge) {
		await jb.delete()
		const systemFromId = this.#jbIDtoSystemID[jb.structure_id]
		if (systemFromId) {
			delete this.#jbIDtoSystemID[jb.structure_id]
			delete this.jbBySystemId[jb.systemFromId]
		}
		delete this.jbByStructure[jb.structure_id]
		const index = findIndex(this.jb, {structure_id: jb.structure_id})
		if (index >= 0) {
			this.jb.splice(index, 1)
		}
	}

	public async addJB(structure_id: number): Promise<EVEJumpBridge> {
		const findJB = this.jbByStructure[structure_id]
		if (findJB) return findJB

		const jb = Vue.observable(new EVEJumpBridge(structure_id))

		// NOTE do not save empty jbs
		// await jb.save()

		this.jb.push(jb)
		this.jbByStructure[jb.structure_id] = jb

		return jb
	}

	public async loadNewEdenRegion(): Promise<EVERegion> {
		store.commit("setLoading", true)

		const EdenRegion = new EVERegion(
			SPECIAL_REGIONS.NEW_EDEN,
			"New Eden",
		)
		await EdenRegion.loadMap()

		store.commit("setLoading", false)

		return EdenRegion
	}

	public async setCurrentRegion(region_id: number): Promise<boolean> {
		const region = this.regions[region_id]
		if (!region) return false

		this.unMarkSystem(`setCurrentRegion: ${region.nameDebug}`)

		store.commit("setLoading", true)

		const loadMapPromise = region.loadMap()

		this.currentRegion?.hideSystems()

		await loadMapPromise

		this.currentRegion = region
		region.storeAsCurrent()

		// @see systemSetMap()
		// this.currentRegion.systems.forEach(system => system.show())

		store.commit("setLoading", false)

		return true
	}

	private async unStoreRegion() {
		const id = EVERegion.getStoredRegionId()
		let isSet = false
		if (id) {
			isSet = await this.setCurrentRegion(id)
		}

		if (!isSet) {
			const region = find(this.regions, {name: "The Forge"})
			if (region) {
				await this.setCurrentRegion(region.id)
			}
		}
	}

	public setSystemKills(record: API_SYSTEM_KILLS) {
		const system = this.systemsById[record.system_id]
		if (!system) return

		system.kills.npc = record.npc_kills
		system.kills.pod = record.pod_kills
		system.kills.ship = record.ship_kills
	}

	public setSystemJumps(record: API_SYSTEM_JUMPS) {
		const system = this.systemsById[record.system_id]
		if (!system) return

		system.jumps = record.ship_jumps
	}

	markedSystem: EVESystem | null = null

	unMarkSystem(cause?: string) {
		// tslint:disable-next-line:no-console
		console.debug("systemManager:unMarkSystem:", cause)
		this.markedSystem = null
	}

	public async markSystem(system: EVESystem, force_change_region = false) {
		this.unMarkSystem(`markSystem:init: ${system.nameDebug}`)

		if (
			system.region_id !== this.currentRegion?.id
			&&
			(
				force_change_region
				|| !system.neighbourRegions.includes(this.currentRegion?.id || 0)
			)
		) {

			await this.setCurrentRegion(system.region_id)
		}

		this.markedSystem = system
	}

	public systemSetMap(id: number, mapCoordinates: MapCoordinates, svgContainer: SVGElement) {
		const system = this.systemsById[id]
		if (!system) return

		system.setMap(mapCoordinates, svgContainer)
	}

	public showRegion() {
		if (!this.currentRegion) return

		const overlay = store.getters.overlay
		if (overlay === OVERLAY_TYPE.ALERT) {
			this.currentRegion.systems.forEach(system => {
				system.show()
			})

			this.currentRegion.neighbourSystems.forEach(system => {
				system.show()
			})
		}

		if (overlay === OVERLAY_TYPE.KILLS) {
			let max = 0
			this.currentRegion.systems.forEach(system => {
				const system_kills = system.kills.ship + system.kills.pod
				if (system_kills > max) max = system_kills
			})

			this.currentRegion.neighbourSystems.forEach(system => {
				const system_kills = system.kills.ship + system.kills.pod
				if (system_kills > max) max = system_kills
			})

			this.currentRegion.systems.forEach(system => {
				system.showKillsOverlay(max)
			})

			this.currentRegion.neighbourSystems.forEach(system => {
				system.showKillsOverlay(max)
			})
		}

		if (overlay === OVERLAY_TYPE.NPC_KILLS) {
			let max = 0
			this.currentRegion.systems.forEach(system => {
				if (system.kills.npc > max) max = system.kills.npc
			})

			this.currentRegion.neighbourSystems.forEach(system => {
				if (system.kills.npc > max) max = system.kills.npc
			})

			this.currentRegion.systems.forEach(system => {
				system.showKillsNpcOverlay(max)
			})

			this.currentRegion.neighbourSystems.forEach(system => {
				system.showKillsNpcOverlay(max)
			})
		}

		if (overlay === OVERLAY_TYPE.JUMPS) {
			let max = 0
			this.currentRegion.systems.forEach(system => {
				if (system.jumps > max) max = system.jumps
			})

			this.currentRegion.neighbourSystems.forEach(system => {
				if (system.jumps > max) max = system.jumps
			})

			this.currentRegion.systems.forEach(system => {
				system.showJumpsOverlay(max)
			})

			this.currentRegion.neighbourSystems.forEach(system => {
				system.showJumpsOverlay(max)
			})
		}

		this.eventLoop()
	}

	private addSystem(
		name: string, id: number, region_id: number, security: number,
		systemsByName, systemsById,
	) {
		if (systemsById[id]) return

		const system = Object.preventExtensions(new EVESystem(name, id, region_id, security))
		systemsByName[name] = system
		systemsById[id] = system
		this.regions[region_id].systems.push(system)
	}

	public getSystemById(id: number): EVESystem | null {
		return this.systemsById[id] || null
	}

	public getSystemByName(name: string): EVESystem | null {
		return this.systemsByName[name] || null
	}
}

const systemManager = reactive(new SystemManager())

export default systemManager
