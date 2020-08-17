import EVESystem from "@/lib/EVESystem";

export interface I_CONTEXT_MENU {
	show: boolean
	x: number
	y: number
	system_id: number
}

export interface IREGION {
	id: number
	name: string
	systems: EVESystem[]
	subscription: EVESystem[]
	neighbourSystems: EVESystem[]
	isSpecial?: {
		newEden?: boolean
	}
}

export enum OVERLAY_TYPE {
	ALERT = "ALERT",
	JUMPS = "JUMPS",
	KILLS = "KILLS",
	NPC_KILLS = "NPC",
}
