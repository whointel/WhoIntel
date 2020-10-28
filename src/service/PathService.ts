import {aStar, PathFinder} from "ngraph.path"
import createGraph, {Graph} from "ngraph.graph"
import systemManager from "@/service/SystemManager"
import EVEJumpBridge, {EVE_JUMP_BRIDGE_STATUS} from "@/lib/EVEJumpBridge"
import events from "@/service/EventBus"
import * as log from "electron-log"
import {IPATHPOINT} from "@/types/PathFinder"
import {reactive} from "@vue/composition-api"
import find from "lodash/find"
import $store from "@/store"
import characterManager from "@/service/CharacterManager"
import EVESystem from "@/lib/EVESystem"
import uniq from "lodash/uniq"

class PathService {
	private readonly graph: Graph<null>
	private readonly pathFinder: PathFinder<null>
	public pathPoints: IPATHPOINT = reactive({
		path: [],
		structures: [],
		start: 0,
		end: 0,
		middle: [],
		exclude: [],
	})

	constructor() {
		this.graph = createGraph<null>()

		this.pathFinder = aStar(this.graph, {
			oriented: true,
		})
	}

	public init() {
		events.$on("systemManager:ready", this.enrichGraph.bind(this, "systemManager:ready"))
		events.$on("JB:ready", this.enrichGraph.bind(this, "JB:ready"))
	}

	private enrichGraph(reason: string) {
		this.graph.clear()
		log.debug("PathService:enrichGraph:", reason)
		console.time("PathService: graph enrich")

		// for (const systemId in systemManager.systemsById) {
		// 	const system_id = Number(systemId)
		// 	const index = this.pathPoints.exclude.findIndex(system => system.id === system_id)
		// 	if (index >= 0) {
		// 		continue
		// 	}
		// 	this.graph.addNode(system_id)
		// }

		for (const systemId in systemManager.systemsById) {
			const system = systemManager.systemsById[systemId]
			if (this.pathPoints.exclude.includes(system as EVESystem)) continue

			system.neighbours.forEach(neighbour => this.graph.addLink(system.id, neighbour.id))
		}

		for (const jb of systemManager.jb) {
			if (
				!jb.systemFromId
				|| !jb.systemToId
				|| jb.status !== EVE_JUMP_BRIDGE_STATUS.API_FOUND
			) {
				continue
			}

			this.graph.addLink(jb.systemFromId, jb.systemToId)
		}
		console.timeEnd("PathService: graph enrich")
	}

	public setStart(system_id: number) {
		this.pathPoints.start = system_id
		this.reCalc()
	}

	setStartFromCurrentSystem() {
		const cur = characterManager.activeCharacter?.location?.id
		if (cur) {
			this.setStart(cur)
		}
	}

	public setEnd(system_id: number) {
		this.pathPoints.end = system_id
		this.reCalc()
	}

	public clearMiddle() {
		this.pathPoints.middle = Object.assign([])
		this.reCalc()
	}

	public addMiddle(system: EVESystem) {
		this.pathPoints.middle.push(system)
		this.pathPoints.middle = uniq(this.pathPoints.middle)
		this.reCalc()
	}

	public addExclude(system: EVESystem) {
		this.pathPoints.exclude.push(system)
		this.pathPoints.exclude = uniq(this.pathPoints.exclude)
		this.enrichGraph("change:excluded")
		this.reCalc()
	}

	public removeMiddleSystem(system_id: number) {
		const index = this.pathPoints.middle.findIndex(system => system.id === system_id)
		if (index >= 0) {
			this.pathPoints.middle.splice(index, 1)
			this.reCalc()
		}
	}

	public removeExcludeSystem(system_id: number) {
		const index = this.pathPoints.exclude.findIndex(system => system.id === system_id)
		if (index >= 0) {
			this.pathPoints.exclude.splice(index, 1)
			this.enrichGraph("change:excluded")
			this.reCalc()
		}
	}

	private reCalcMiddlePath(start: EVESystem, middle: EVESystem[]): number[] {
		if (!middle.length) return []

		let pathIdsBestFromNext: number[] = []
		let cntScoped = 10000

		middle.forEach((systemNext, index) => {
			const pathIdsToNext = this.find(start.id, systemNext.id)

			const middleCopy = middle.slice()
			middleCopy.splice(index, 1)
			const pathIdsFromNext = this.reCalcMiddlePath(systemNext, middleCopy)

			const cntLocalScoped = pathIdsToNext.length + pathIdsFromNext.length

			if (cntScoped > cntLocalScoped) {
				cntScoped = cntLocalScoped
				pathIdsBestFromNext = pathIdsToNext

				if (pathIdsFromNext.length) {
					pathIdsBestFromNext = pathIdsBestFromNext.concat(pathIdsFromNext)
				}
			}
		})

		return pathIdsBestFromNext
	}

	private reCalc() {
		this.pathPoints.structures = []
		this.pathPoints.path = []
		$store.commit("setShowPathPanel", true)

		if (
			!this.pathPoints.start
			|| (
				!this.pathPoints.end
				&& !this.pathPoints.middle.length
			)
		) {
			return
		}

		let pathIds: number[]
		let currentSystem = systemManager.getSystemById(this.pathPoints.start) as EVESystem

		if (this.pathPoints.middle.length) {
			const label = `PathService: path finding by middle system, ${currentSystem.nameDebug} -> ${this.pathPoints.middle.map(system => system.nameDebug)}`
			console.time(label)

			pathIds = this.reCalcMiddlePath(
				currentSystem,
				this.pathPoints.middle,
			)
			console.timeEnd(label)

		} else {
			pathIds = this.find(this.pathPoints.start, this.pathPoints.end)
		}

		if (!pathIds.length) return

		for (const id of pathIds) {
			let next = find(currentSystem!.neighbours, {id: id})
			if (next) {

				// console.debug(`${currentSystem?.name} / D / ${next?.name}`)
				this.pathPoints.path.push({
					system: currentSystem!,
				})
				currentSystem = next
				continue
			}

			const jb = systemManager.jbBySystemId[currentSystem!.id]
			if (
				!jb
				|| jb.systemTo?.id !== id
			) {
				throw "path found error"
			}

			next = jb.systemTo as EVESystem
			if (!next) throw "path found error"

			this.pathPoints.structures.push(jb.structure_id)

			// console.debug(`${currentSystem?.name} / ${jb?.name} / ${next?.name}`)
			this.pathPoints.path.push({
				system: currentSystem!,
				jb: jb as EVEJumpBridge,
			})
			currentSystem = next
		}

		this.pathPoints.path.push({
			system: currentSystem!,
		})

		this.pathPoints.structures.push(currentSystem!.id)
		// console.debug(pathPoints.structures)
	}

	public find(system_from_id: number, system_to_id: number): number[] {
		const label = `PathService: path finding, ${system_from_id} -> ${system_to_id}`
		console.time(label)

		const path = this.pathFinder.find(system_from_id, system_to_id)

		const pathResult = path.reverse()
		pathResult.shift()

		console.timeEnd(label)

		// const debugSystems = {}
		// pathResult.forEach(node => {
		// 	debugSystems[node.id] = systemManager.systemsById[node.id].name
		// })
		// console.table(debugSystems)

		return pathResult.map(node => node.id as number)
	}
}

const pathService = Object.preventExtensions(new PathService())

export default pathService
