export interface IWindowLayoutScroll {
	top: number
	left: number
	scale: number
}

export interface IWindowLayout {
	uuid: string
	title: string,
	hideLogPanel: boolean
	hideTopPanel: boolean
	winOpacity: number
	winSkipTaskbar: boolean
	winMaximized: boolean
	winAlwaysOnTop: boolean
	winIgnoreMouseEvents: boolean
	winSize: [number | null, number | null]
	winPosition: [number | null, number | null]
	scroll: IWindowLayoutScroll
}
