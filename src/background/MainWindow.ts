import {app, BrowserWindow, ipcMain} from "electron"
import {
	createProtocol,
} from "vue-cli-plugin-electron-builder/lib"
import * as path from "path"
import {getMenu} from "@/background/MainWindowMenu"
import {IWindowLayout} from "@/types/WidnowLayout"
import {isPlatformWin} from "@/background/helpers"

class MainWindow {
	// Keep a global reference of the window object, if you don't, the window will
	// be closed automatically when the JavaScript object is garbage collected.
	private win: BrowserWindow | null = null
	private isQuiting = false
	private isHidden = true

	constructor() {
		ipcMain.on("window::setOpacity", (event, args) => {
			if (!this.win) return
			this.win.setOpacity(args)
		})

		ipcMain.on("window::setAlwaysOnTop", (event, args) => {
			if (!this.win) return
			this.win.setAlwaysOnTop(args)
		})

		ipcMain.on("window::setIgnoreMouseEvents", (event, args) => {
			if (!this.win) return
			this.win.setIgnoreMouseEvents(args)
		})

		ipcMain.on("window::restore", (event, args) => {
			this.show()
		})

		ipcMain.on("window:layouts:refresh", (event, args) => {
			this.send("window:layouts:refresh")
		})

		ipcMain.on("window:layouts:apply", (event, args) => {
			this.setLayout(args)
		})

		ipcMain.handle("window:get:positionsize", (event, args) => {
			if (!this.win) return

			return {
				size: this.win.getSize(),
				position: this.win.getPosition(),
				isMaximized: this.win.isMaximized(),
			}
		})
	}

	private setLayout(layout: IWindowLayout) {
		if (!this.win) return

		this.win.setOpacity(layout.winOpacity / 100)
		this.win.setSkipTaskbar(layout.winSkipTaskbar)
		this.win.setAlwaysOnTop(layout.winAlwaysOnTop)
		this.win.setIgnoreMouseEvents(layout.winIgnoreMouseEvents)

		this.win.restore()
		this.win.setPosition(Number(layout.winPosition[0]) || 0, Number(layout.winPosition[1]) || 0, false)

		if (layout.winMaximized) {
			this.win.maximize()
		} else {
			this.win.setSize(Number(layout.winSize[0]) || 500, Number(layout.winSize[1]) || 500, false)
		}
	}

	public getWindow(): BrowserWindow | null {
		return this.win
	}

	public send(channel: string, args: any = null) {
		if (!this.win) return

		this.win.webContents.send(channel, args)
	}

	public show() {
		this.isHidden = false
		if (!this.win) return
		this.win.show()
		this.win.focus()
	}

	public hide() {
		this.isHidden = true
		if (!this.win) return
		this.win.hide()
	}

	public switchVisibility() {
		this.isHidden ? this.show() : this.hide()
	}

	public async createWindow() {
		// app.on("activate")
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (this.win) return // TODO

		// Create the browser window.
		this.win = new BrowserWindow({
			show: false,
			backgroundColor: "#FFFFFF",
			frame: !isPlatformWin,
			title: "WhoIntel",
			// @ts-ignore
			icon: path.join(__static, "icon.png"),
			webPreferences: {
				nodeIntegration: true,
				backgroundThrottling: false,
				contextIsolation: false,
				autoplayPolicy: "no-user-gesture-required", // default, used for alarm sound play
			},
		})

		this.win.setMenu(getMenu())

		this.win.once("ready-to-show", () => {
			if (!this.win) return

			this.show()
			this.win.maximize()
		})

		if (process.env.WEBPACK_DEV_SERVER_URL) {
			// Load the url of the dev server if in development mode
			await this.win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
			if (!process.env.IS_TEST) this.win.webContents.openDevTools()
		} else {
			createProtocol("app")

			// Load the index.html when not in development
			await this.win.loadURL("app://./index.html")
		}

		this.win.on("closed", () => {
			app.quit()
		})

		this.win.on("close", (event) => {
			if (!this.isQuiting && this.win) {
				event.preventDefault()
				this.hide()
				return false
			}
		})

		this.win.on("app-command", (e, cmd) => {
			this.send(`app-command:${cmd}`)
		})
	}

	public setQuiting() {
		this.isQuiting = true
	}

	public closeExit() {
		this.isQuiting = true

		if (!this.win) return

		this.win.close()
	}
}

const mainWindow = new MainWindow()

export default mainWindow
