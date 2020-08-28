import {aStar, PathFinder} from "ngraph.path"
import createGraph, {Graph} from "ngraph.graph"
import systemManager from "@/service/SystemManager"
import {EVE_JUMP_BRIDGE_STATUS} from "@/lib/EVEJumpBridge"
import events from "@/service/EventBus"
import * as log from "electron-log"

/**
 * TODO cache
 */
class PathService {
	private readonly graph: Graph<null>
	private readonly pathFinder: PathFinder<null>

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

const pathService = new PathService()

export default pathService
