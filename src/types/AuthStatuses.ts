export enum AUTH_STATUSES {
	NONE = "NONE",
	INIT = "INIT",
	PROGRESS = "PROGRESS",
	CANCEL = "CANCEL",
	ERROR = "CANCEL",
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
