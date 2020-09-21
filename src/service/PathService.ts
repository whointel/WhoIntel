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

class PathService {
	private readonly graph: Graph<null>
	private readonly pathFinder: PathFinder<null>
	public pathPoints: IPATHPOINT = reactive({
		path: [],
		structures: [],
		start: 0,
		end: 0,
		middle: [],
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

		for (const systemId in systemManager.systemsById) {
			this.graph.addNode(systemId)
		}

		for (const systemId in systemManager.systemsById) {
			const system = systemManager.systemsById[systemId]
			system.neighbours.forEach(neighbour => this.graph.addLink(system.id, neighbour.id))
		}

		for (const jb of systemManager.jb) {
			if (
				!jb.systemFromId
				|| !jb.systemToId
				|| jb.status !== EVE_JUMP_BRIDGE_STATUS.API_FOUND
			) continue

			this.graph.addLink(jb.systemFromId, jb.systemToId)
		}
		console.timeEnd("PathService: graph enrich")
	}

	public setStart(system_id: number) {
		this.pathPoints.start = system_id
		this.reCalc()
	}

	setStartFromCurrentSystem() {
		const cur = characterManager.activeCharacter?.system?.id
		if (cur) {
			this.setStart(cur)
		}
	}

	public setEnd(system_id: number) {
		this.pathPoints.end = system_id
		this.reCalc()
	}

	public setMiddle(system_id: number) {
		// this.pathPoints.middle.push(system_id)
		// this.recalc()
	}

	private reCalc() {
		this.pathPoints.structures = []
		this.pathPoints.path = []
		$store.commit("setShowPathPanel", true)

		if (
			!this.pathPoints.start
			|| !this.pathPoints.end
		) {
			return
		}

		const pathIds = this.find(this.pathPoints.start, this.pathPoints.end)
		if (!pathIds.length) return

		let currentSystem = systemManager.getSystemById(this.pathPoints.start)

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
			) throw "path found error"

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
