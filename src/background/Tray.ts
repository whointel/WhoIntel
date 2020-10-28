import {ipcMain, Menu, MenuItemConstructorOptions, Tray} from "electron"
import mainWindow from "@/background/MainWindow"
import {getAsses} from "@/background/Assets"
import layoutsWindow from "@/background/LayoutsWindow"
import {isPlatformWin} from "@/background/helpers"

// const isDevelopment = process.env.NODE_ENV !== "production"
// const TRY_ICON_GUID = isDevelopment ? "253441ab-b2c6-4ae7-9072-498358e1eb45" : "c5a55c57-fc93-49d4-9b45-277759866786"

interface ITrayMenuLayout {
	uuid: string
	title: string
}

export default class TrayMenu {
	private tray: Tray
	private layouts: ITrayMenuLayout[] = []

	constructor() {
		this.tray = new Tray(getAsses(isPlatformWin ? "icons/icon.ico" : "icons/16x16.png"), /*TRY_ICON_GUID*/)
		this.tray.setToolTip("WhoIntel")

		if (isPlatformWin) {
			this.tray.on("click", () => {
				mainWindow.switchVisibility()
			})

			this.tray.on("right-click", () => {
				this.tray.popUpContextMenu()
			})
		}

		ipcMain.on("window:layouts", (event, layouts: ITrayMenuLayout[]) => {
			this.layouts = layouts
			this.setContextMenu()
		})

		this.setContextMenu()
	}

	private sendLayoutSwitch(uuid: string | null) {
		mainWindow.send("window:layouts:apply:request", uuid)
	}

	private createMenu(): Menu {
		const layouts: MenuItemConstructorOptions[] = []

		if (this.layouts.length === 0) {
			layouts.push({
				label: "No custom layouts",
				enabled: false,
			})
		} else {
			this.layouts.forEach(layout => {
				layouts.push({
					label: layout.title,
					click: () => {
						this.sendLayoutSwitch(layout.uuid)
					},
				})
			})
		}

		layouts.push({type: "separator"})
		layouts.push({
			label: "Восстановить начальные размер и положение",
			click: () => {
				this.sendLayoutSwitch(null)
			},
		})
		layouts.push({
			label: "Открыть окно настроек расположения",
			click: () => {
				layoutsWindow.createWindow()
			},
		})

		return Menu.buildFromTemplate([
			{
				label: "Показать",
				click() {
					mainWindow.show()
				},
			},
			{type: "separator"},
			{
				label: "Layouts",
				type: "submenu",
				submenu: layouts,
			},
			{type: "separator"},
			{
				label: "Закрыть программу",
				click() {
					mainWindow.closeExit()
				},
			},
		])
	}

	setContextMenu() {
		const contextMenu = this.createMenu()
		this.tray.setContextMenu(contextMenu)
	}
}
