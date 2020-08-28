import EVESystem from "@/lib/EVESystem"
import EVEJumpBridge from "@/lib/EVEJumpBridge"

export interface IPATHPOINT {
	path: Array<{
		system: EVESystem
		jb?: EVEJumpBridge
	}>
	structures: number[]
}
