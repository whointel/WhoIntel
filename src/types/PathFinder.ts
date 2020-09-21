import EVESystem from "@/lib/EVESystem"
import EVEJumpBridge from "@/lib/EVEJumpBridge"

export interface IPATHPOINT_POINT {
	system: EVESystem
	jb?: EVEJumpBridge
}

export interface IPATHPOINT {
	path: IPATHPOINT_POINT[]
	structures: number[]
	start: number
	end: number
	middle: number[]
}
