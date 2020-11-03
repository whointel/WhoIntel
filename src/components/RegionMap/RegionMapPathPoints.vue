<template>
	<svg>
		<marker
			viewBox="0 0 33 20" id="path_start"
			markerUnits="strokeWidth" markerWidth="13" markerHeight="10"
			orient="auto"
			refX="-8"
			refY="5"
		>
			<path d="M 0 0 L 13 5 L 0 10 z" fill="#f00"/>
		</marker>

		<marker
			viewBox="0 0 33 20" id="path_end"
			markerUnits="strokeWidth" markerWidth="13" markerHeight="10"
			refX="20"
			refY="5"
			orient="auto"
		>
			<path d="M 0 0 L 13 5 L 0 10 z" fill="#f00"/>
		</marker>

		<g
			v-for="(line, index) in pathFinderPoints"
			:key="index"
		>
			<line
				:x1="line.x1" :y1="line.y1"
				:x2="line.x2" :y2="line.y2"
				:stroke="line.jb ? 'green' : 'orange'"
				stroke-width="3"
				stroke-dasharray="4 1"
				:marker-start="index === 0 ? 'url(#path_start)' : ''"
				:marker-end="pathFinderPoints.length - 1 === index ? 'url(#path_end)' : ''"
			/>
			<circle
				v-if="index === 0 && !line.start"
				:fill="line.jb ? 'green' : 'orange'"
				:cx="line.x1" :cy="line.y1" r="4"
			/>
			<circle
				v-if="pathFinderPoints.length - 1 === index && !line.end"
				:fill="line.jbNext ? 'green' : 'orange'"
				:cx="line.x2" :cy="line.y2" r="4"
			/>
		</g>
	</svg>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import systemManager from "@/service/SystemManager"
import {IPATHPOINT, IPATHPOINT_POINT} from "@/types/PathFinder"
import pathService from "@/service/PathService"

@Component
export default class RegionMapPathPoints extends Vue {
	get pathFinderPoints(): IPATHPOINT[] {
		let result: any[] = []
		let pathPoint: IPATHPOINT_POINT
		let pathPointNext: IPATHPOINT_POINT
		const currentRegionId = systemManager.currentRegion?.id

		for (let i = 0; i < pathService.pathPoints.path.length - 1; i++) {
			pathPoint = pathService.pathPoints.path[i]
			pathPointNext = pathService.pathPoints.path[i + 1]

			if (
				!pathPoint.system.mapCoordinates
				|| !pathPointNext.system.mapCoordinates
			) {
				continue
			}

			// jump start AND stop systems are not in current region, skip
			if (
				currentRegionId !== pathPoint.system.region_id
				&& currentRegionId !== pathPointNext.system.region_id
			) {
				continue
			}

			// jump start OR stop systems are not in current region, skip
			if (
				currentRegionId !== pathPoint.system.region_id
				|| currentRegionId !== pathPointNext.system.region_id
			) {
				if (
					!pathPoint.system.neighbourRegions.includes(currentRegionId)
					&& !pathPointNext.system.neighbourRegions.includes(currentRegionId)
				) {
					if (!!pathPoint.jb && result.length) {
						result[result.length - 1].jbNext = true
					}
					continue
				}
			}

			result.push({
				x1: pathPoint.system.mapCoordinates?.center_x + 4,
				y1: pathPoint.system.mapCoordinates?.center_y + 4,
				x2: pathPointNext.system.mapCoordinates?.center_x + 4,
				y2: pathPointNext.system.mapCoordinates?.center_y + 4,
				jb: !!pathPoint.jb,
				jbNext: false,
				start: i === 0,
				end: i === (pathService.pathPoints.path.length - 2),
			})
		}

		return result
	}
}
</script>
