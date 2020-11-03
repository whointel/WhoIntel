export enum OVERLAY_TYPE {
	ALERT = "ALERT",
	JUMPS = "JUMPS",
	KILLS = "KILLS",
	NPC_KILLS = "NPC",
}

export interface CONTEXT_MENU {
	show: boolean
	x: number
	y: number
	system_id: number
}
