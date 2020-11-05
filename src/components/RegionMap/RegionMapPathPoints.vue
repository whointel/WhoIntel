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
			v-for="line in pathFinderPoints.lines"
			:key="line.key"
		>
			<line
				:x1="line.x1" :y1="line.y1"
				:x2="line.x2" :y2="line.y2"
				:stroke="line.jb ? 'green' : 'orange'"
				stroke-width="3"
				stroke-dasharray="4 1"
				:marker-start="line.begin ? 'url(#path_start)' : ''"
				:marker-end="line.end ? 'url(#path_end)' : ''"
			/>
			<circle
				v-if="line.begin"
				:fill="line.jbPrev ? '#11FF11' : 'orange'"
				:cx="line.x1" :cy="line.y1" r="4"
			/>
			<circle
				v-if="line.end"
				:fill="line.jbNext ? '#11FF11' : 'orange'"
				:cx="line.x2" :cy="line.y2" r="4"
			/>
		</g>
		<g
			v-for="point in pathFinderPoints.points"
			:key="point.key"
		>
			<circle
				v-if="point.begin"
				:fill="point.jb ? '#11FF11' : 'orange'"
				:cx="point.x" :cy="point.y" r="4"
			/>
			<circle
				v-if="point.end"
				:fill="point.jb ? '#11FF11' : 'orange'"
				:cx="point.x" :cy="point.y" r="4"
			/>
		</g>
	</svg>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import systemManager from "@/service/SystemManager"
import {IPATHPOINT_POINT} from "@/types/PathFinder"
import pathService from "@/service/PathService"

interface pathFinderPointsResult {
	lines: {
		x1: number
		y1: number
		x2: number
		y2: number
		jb: boolean
		jbNext: boolean
		jbPrev: boolean
		begin: boolean
		end: boolean
		key: string
	}[],
	points: {
		x: number
		y: number
		jb: boolean
		begin: boolean
		end: boolean
		key: string
		system: string
	}[]
}

@Component
export default class RegionMapPathPoints extends Vue {
	get pathFinderPoints(): pathFinderPointsResult {
		let result: pathFinderPointsResult = {
			lines: [],
			points: [],
		}
		let pathPoint: IPATHPOINT_POINT
		let pathPointPrev: IPATHPOINT_POINT | null
		let pathPointNext: IPATHPOINT_POINT
		const currentRegionId = systemManager.currentRegion?.id

		if (!currentRegionId) return result

		let isPathSectionStart = true

		const previousLine = () => result.lines.length ? result.lines[result.lines.length - 1] : null
		const setEndLastLineTrue = () => {
			const previousLineObj = previousLine()
			if (previousLineObj) previousLineObj.end = true
		}

		for (let i = 0; i < pathService.pathPoints.path.length - 1; i++) {
			pathPoint = pathService.pathPoints.path[i]
			pathPointNext = pathService.pathPoints.path[i + 1]
			pathPointPrev = pathService.pathPoints.path[i - 1]

			if (
				!pathPoint
				|| !pathPointNext
				|| !pathPoint.system.mapCoordinates
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
				if (!pathPointNext.system.neighbourRegions.includes(currentRegionId)) {
					previousLine()
					setEndLastLineTrue()
					isPathSectionStart = true
				}

				if (
					!pathPoint.system.neighbourRegions.includes(currentRegionId)
					&& !pathPointNext.system.neighbourRegions.includes(currentRegionId)
				) {

					continue
				}
			}

			result.lines.push({
				x1: pathPoint.system.mapCoordinates?.center_x + 4,
				y1: pathPoint.system.mapCoordinates?.center_y + 4,
				x2: pathPointNext.system.mapCoordinates?.center_x + 4,
				y2: pathPointNext.system.mapCoordinates?.center_y + 4,
				jbPrev: pathPointPrev && !!pathPointPrev.jb,
				jb: !!pathPoint.jb,
				jbNext: !!pathPointNext.jb,
				begin: isPathSectionStart,
				end: false,
				key: `pl_${pathPoint.system.id}_${pathPointNext.system.id}`
			})

			isPathSectionStart = false
		}

		setEndLastLineTrue()

		// fix dot for first and only point in region/path
		pathPoint = pathService.pathPoints.path[0]
		if (
			pathPoint
			&& pathPoint.system.mapCoordinates
			&& (
				currentRegionId === pathPoint.system.region_id
				|| pathPoint.system.neighbourRegions.includes(currentRegionId)
			)
		) {
			result.points.push({
				x: pathPoint.system.mapCoordinates?.center_x + 4,
				y: pathPoint.system.mapCoordinates?.center_y + 4,
				jb: !!pathPoint.jb,
				system: pathPoint.system.nameDebug,
				begin: true,
				end: false,
				key: `pp1_${pathPoint.system.id}`,
			})
		}

		// fix dot for last and only point in region/path
		pathPoint = pathService.pathPoints.path[pathService.pathPoints.path.length - 1]
		pathPointPrev = pathService.pathPoints.path[pathService.pathPoints.path.length - 2]
		if (
			currentRegionId
			&& pathPoint
			&& pathPointPrev
			&& pathPoint.system.mapCoordinates
			&& (
				currentRegionId === pathPoint.system.region_id
				|| pathPoint.system.neighbourRegions.includes(currentRegionId)
			)
		) {
			result.points.push({
				x: pathPoint.system.mapCoordinates?.center_x + 4,
				y: pathPoint.system.mapCoordinates?.center_y + 4,
				jb: !!pathPointPrev.jb,
				system: pathPoint.system.nameDebug,
				begin: false,
				end: true,
				key: `pp2_${pathPoint.system.id}`,
			})
		}

		return result
	}
}
</script>
