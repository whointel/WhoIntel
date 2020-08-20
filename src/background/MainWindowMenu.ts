import {MenuItem, Menu, ipcMain, MenuItemConstructorOptions} from "electron"
import mainWindow from "@/background/MainWindow"
import {isPlatformMacOS} from "@/background/helpers"

const fileSubMenu: MenuItemConstructorOptions[] = [
	{
		label: "Settings",
		click() {
			mainWindow.send("open:config")
		}
	},
	{type: "separator"},
	{
		label: "Quit",
		click() {
			mainWindow.closeExit()
		},
	},
]

if (isPlatformMacOS) {
	fileSubMenu.unshift({type: "separator"})
	fileSubMenu.unshift({role: "services"})
}

const winMenu: MenuItem = new MenuItem({
	label: "File",
	submenu: fileSubMenu,
})

const viewMenu: MenuItem = new MenuItem({
	label: "View",
	submenu: [
		{role: "reload"},
		{role: "forceReload"},
		{role: "toggleDevTools"},
		{type: "separator"},
		{role: "resetZoom"},
		{role: "zoomIn"},
		{role: "zoomOut"},
		{type: "separator"},
		{role: "togglefullscreen"}
	]
});

const helpMenu: MenuItem = new MenuItem({
	label: "Help",
	submenu: [
		{
			label: "About",
			click() {
				mainWindow.send("open:about")
			}
		}
	]
})

export const menuTemplate: MenuItem[] = [
	winMenu,
	viewMenu,
	helpMenu,
]

const appMenu = Menu.buildFromTemplate(menuTemplate)

ipcMain.on("app-menu:popup", (event, args) => {
	appMenu.popup({
		window: mainWindow.getWindow() as any,
		x: args.x, y: args.y
	})
})

ipcMain.on("app-menu:minimize", (event, args) => {
	const win = mainWindow.getWindow()
	if (win && win.minimizable) {
		win.minimize()
	}
})

ipcMain.on("app-menu:maximize", (event, args) => {
	const win = mainWindow.getWindow()
	if (win && win.maximizable) {
		win.maximize()
	}
})

ipcMain.on("app-menu:close", (event, args) => {
	// win && win.hide()
	const win = mainWindow.getWindow()
	win && win.hide()
})

ipcMain.on("app-menu:unmaximize", (event, args) => {
	const win = mainWindow.getWindow()
	win && win.unmaximize()
})

ipcMain.on("app-menu:isMaximized", (event, args) => {
	const win = mainWindow.getWindow()
	win && mainWindow.send(win.isMaximized() ? "app-menu:maximize" : "app-menu:unmaximize")
})

export const getMenu = () => {
	return appMenu
}

export default function createMenu() {
	const win = mainWindow.getWindow()
	if (!win) return

	win.on('focus', () => {
		win && win.webContents.send("app-menu:focus")
	})
	win.on('blur', () => {
		win && win.webContents.send("app-menu:blur")
	})
	win.on('maximize', () => {
		win && win.webContents.send("app-menu:maximize")
	})
	win.on('unmaximize', () => {
		win && win.webContents.send("app-menu:unmaximize")
	})

	// Menu.setApplicationMenu(null)
	Menu.setApplicationMenu(appMenu)
}
