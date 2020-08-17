import EVESystem from "@/lib/EVESystem"
import EVEJumpBride from "@/lib/EVEJumpBride"

export interface IPATHPOINT {
	path: Array<{
		system: EVESystem
		jb?: EVEJumpBride
	}>
	structures: number[]
}
