<template>
	<svg>
		<g v-for="jb in jumpBridges" :key="jb.id">
			<line
				:x1="jb.x1" :y1="jb.y1"
				:x2="jb.x2" :y2="jb.y2"
				:stroke="'#' + jb.color"
				stroke-width="2"
				stroke-dasharray="2"
				:marker-start="jb.markerStart"
				:marker-end="jb.markerEnd"
			/>
			<rect
				:x="jb.rectLeft.x" :y="jb.rectLeft.y"
				:stroke="'#' + jb.color"
				stroke-width="1.5"
				:fill="'#' + jb.color"
				fill-opacity="0.4"
				:width="jb.rectLeft.width"
				:height="jb.rectLeft.height"
			/>
			<rect
				v-if="jb.rectRight"
				:x="jb.rectRight.x" :y="jb.rectRight.y"
				:stroke="'#' + jb.color"
				stroke-width="1.5"
				:fill="'#' + jb.color"
				fill-opacity="0.4"
				:width="jb.rectRight.width"
				:height="jb.rectRight.height"
			/>
		</g>

		<g v-for="jbColor in JB_COLORS" :key="jbColor">
			<marker
				viewBox="0 0 20 20" :id="`arrowstart_${jbColor}`"
				markerUnits="strokeWidth" markerWidth="20" markerHeight="15"
				refX="-25" refY="5" orient="auto"
				:style="`fill:#${jbColor}`"
			>
				<path d="M 0 0 L 10 5 L 0 10 z"></path>
			</marker>

			<marker
				viewBox="0 0 20 20" :id="`arrowend_${jbColor}`"
				markerUnits="strokeWidth" markerWidth="20" markerHeight="15"
				refX="25" refY="5" orient="auto"
				:style="`fill:#${jbColor}`"
			>
				<path d="M 0 0 L 10 5 L 0 10 z"></path>
			</marker>

			<marker
				viewBox="0 0 20 20" :id="`arrowout_${jbColor}`"
				markerUnits="strokeWidth" markerWidth="10" markerHeight="10"
				:style="`fill:#${jbColor}`"
			>
				<circle r="5"/>
			</marker>
		</g>

	</svg>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import systemManager from "@/service/SystemManager"
import EVESystem from "@/lib/EVESystem"
import {JB_DIRECTION_DIRECTION} from "@/lib/EVEJumpBridge"
import * as log from "electron-log"

const JB_COLORS = Object.freeze(["800000", "808000", "BC8F8F", "ff00ff", "c83737", "FF6347", "917c6f", "ffcc00",
	"88aa00", "FFE4E1", "008080", "00BFFF", "4682B4", "00FF7F", "7FFF00", "ff6600",
	"CD5C5C", "FFD700", "66CDAA", "AFEEEE", "5F9EA0", "FFDEAD", "696969", "2F4F4F"])

interface JB_DATA {
	left: EVESystem
	direction: JB_DIRECTION_DIRECTION
	right: EVESystem
	out_region: boolean
}

@Component
export default class RegionMapJumpBridges extends Vue {
	JB_COLORS = JB_COLORS

	get isJBShow() {
		return this.$store.getters.isJBShow
	}

	get jumpBridges(): any[] {
		if (!this.isJBShow) return []

		const jbData: JB_DATA[] = []

		let jbs = new Set<string>()

		systemManager.jb.forEach(jb => {
			if (!systemManager.currentRegion) return

			const systemFrom = jb.systemFrom
			const systemTo = jb.systemTo

			if (
				!systemFrom
				|| !systemTo
			) {
				return
			}

			if (
				!systemManager.currentRegion.systems.includes(systemFrom)
				&& !systemManager.currentRegion.neighbourSystems.includes(systemFrom)
			) {
				return
			}

			let uniq_id = `${systemFrom.id}_${systemTo.id}`
			if (systemFrom.id > systemTo.id) {
				uniq_id = `${systemTo.id}_${systemFrom.id}`
			}

			if (jbs.has(uniq_id)) return

			jbs.add(uniq_id)

			let direction: JB_DIRECTION_DIRECTION =
				systemManager.jbBySystemId[systemTo.id] ? JB_DIRECTION_DIRECTION.TO_BOTH : JB_DIRECTION_DIRECTION.TO_RIGHT
			// JB_DIRECTION_DIRECTION.TO_RIGHT

			jbData.push({
				left: systemFrom as EVESystem,
				direction: direction,
				right: systemTo as EVESystem,
				out_region: systemTo.region_id !== systemManager.currentRegion?.id,
			})
		})

		log.info("RegionMap %d, JB found", systemManager.currentRegion?.id, jbData.length)

		const result: any[] = []

		let colorCount = 0
		jbData.forEach(jb => {
			if (colorCount > JB_COLORS.length - 1) colorCount = 0
			const jbColor = JB_COLORS[colorCount]
			colorCount += 1

			let markerStart = ""
			let markerEnd = ""

			if (jb.direction === JB_DIRECTION_DIRECTION.TO_RIGHT) {
				markerStart = `url(#arrowstart_${jbColor})`

				if (!jb.out_region) {
					markerEnd = `url(#arrowend_${jbColor})`
				}
			}

			if (jb.out_region) {
				markerEnd = `url(#arrowout_${jbColor})`
			}

			result.push({
				id: `${jb.left.id}_${jb.right.id}`,
				x1: jb.left.mapCoordinates!.center_x + 2,
				y1: jb.left.mapCoordinates!.center_y + 2,
				x2: jb.out_region ? (jb.left.mapCoordinates!.center_x - 40) : (jb.right.mapCoordinates!.center_x + 2),
				y2: jb.out_region ? (jb.left.mapCoordinates!.center_y - 30) : (jb.right.mapCoordinates!.center_y + 2),
				color: jbColor,
				markerStart: markerStart,
				markerEnd: markerEnd,

				rectLeft: {
					x: jb.left.mapCoordinates!.x - 3,
					y: jb.left.mapCoordinates!.y - 1,
					width: jb.left.mapCoordinates!.width + 1.5,
					height: jb.left.mapCoordinates!.height + 1.5,
				},
				rectRight: jb.out_region ? null : {
					x: jb.right.mapCoordinates!.x - 3,
					y: jb.right.mapCoordinates!.y - 1,
					width: jb.right.mapCoordinates!.width + 1.5,
					height: jb.right.mapCoordinates!.height + 1.5,
				},
			})
		})

		return result
	}
}
</script>
