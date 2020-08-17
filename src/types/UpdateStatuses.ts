export enum UPDATE_STATUSES {
	CHECKING_FOR_UPDATE,
	UPDATE_NOT_AVAILABLE,
	UPDATE_AVAILABLE,
	UPDATE_DOWNLOADING,
	UPDATE_DOWNLOADED,
	ERROR
}

export interface IUpdateStatus {
	status: UPDATE_STATUSES,
	data: {
		error?: string
		version?: string
	}
}
