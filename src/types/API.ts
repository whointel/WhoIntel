export interface API_FLEET {
	fleet_id: number
	role: string
	squad_id: number
	wing_id: number
}

export enum API_FLEET_MEMBER_ROLE {
	FLEET_COMMANDER = "fleet_commander",
	WING_COMMANDER = "wing_commander",
	SQUAD_COMMANDER = "squad_commander",
	SQUAD_MEMBER = "squad_member",
}

export interface API_FLEET_MEMBER {
	character_id: number
	join_time: string // Date
	role: API_FLEET_MEMBER_ROLE
	role_name: string
	ship_type_id: number
	solar_system_id: number
	squad_id: number
	takes_fleet_warp: boolean
	wing_id: number
	station_id?: number
}

export interface API_STRUCTURE {
	name: string
	owner_id: number
	position?: {
		x: number
		y: number
		z: number
	}
	solar_system_id: number
	type_id?: number
}

export interface API_STATUS {
	players: number
	server_version: string
	start_time: string
	vip?: boolean
}

export interface API_CHARACTER_ONLINE {
	last_login?: string
	last_logout?: string
	logins?: number
	online: boolean
}

export interface API_CHARACTER_SHIP {
	ship_item_id: number
	ship_name: string
	ship_type_id: number
}

export interface API_CHARACTER_LOCATION {
	solar_system_id: number
	structure_id: number
	station_id: number
}

export interface API_SYSTEM_JUMPS {
	ship_jumps: number
	system_id: number
}

export interface API_SYSTEM_KILLS {
	npc_kills: number
	pod_kills: number
	ship_kills: number
	system_id: number
}

export interface IAPICharacter {
	alliance_id: number | null
	ancestry_id: number
	birthday: string
	bloodline_id: number
	corporation_id: number
	description: string
	gender: string
	name: string
	race_id: number
	security_status: number

	expires: Date // custom
}
