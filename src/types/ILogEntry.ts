import EVESystem from "@/lib/EVESystem"

export const enum LOG_ENTRY_TYPE {
	LOCAL,
	SECURE,
	ZKILLBOARD,
}

export interface ILogEntry {
	ts: Date
	sender: string
	message: string
	channel: string
	systems: EVESystem[]
	hash: string
	character: string | null
	type: LOG_ENTRY_TYPE
	zk?: {
		npcOnly: boolean
		character_id: number
		url: string
		old: boolean
	},
	secure?: {
		question: boolean
		clear: boolean
		boost: boolean
	}
}
