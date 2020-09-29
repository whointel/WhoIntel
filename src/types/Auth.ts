export enum AUTH_ERROR {
	NONE = "NONE",
	ERROR = "ERROR",

	CANCEL = "CANCEL",
	PROCESS_AUTH_TOKEN = "PROCESS_AUTH_TOKEN",
	ALREADY_IN_PROGRESS = "ALREADY_IN_PROGRESS",
	REFRESH_AUTH = "REFRESH_AUTH",
}

export enum AUTH_STATUSES {
	NONE = "NONE",
	INIT = "INIT",
	PROGRESS = "PROGRESS",
	CANCEL = "CANCEL",
	ERROR = "ERROR",
	AUTH = "AUTH",
}

export interface IAuthStatus {
	status: AUTH_STATUSES,
	error?: string | null,
	auth?: {
		refresh_token: any
		access_token: any
		token: any
	}
}

export interface IAuthToken {
	azp: string
	exp: number
	iss: string
	jti: string
	kid: string
	name: string
	owner: string
	scp: string[]
	sub: string
}

export interface IAuth {
	refresh_token: string | null
	access_token: string | null
	token: IAuthToken | null
	authStatus: AUTH_STATUSES
	authError: any

	isAuthed: boolean
	character_id: number | null
}

export interface IAuthBackend {
	refresh_token: string
	access_token: string
	token: IAuthToken
}
