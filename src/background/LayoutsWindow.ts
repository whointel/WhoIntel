import {BrowserWindow} from "electron"
import * as path from "path"
import * as log from "electron-log"

const URL_POSTFIX = "#layouts"

class LayoutsWindow {
	// Keep a global reference of the window object, if you don't, the window will
	// be closed automatically when the JavaScript object is garbage collected.
	private win: BrowserWindow | null = null

	public getWindow(): BrowserWindow | null {
		return this.win
	}

	public send(channel: string, args: any = null) {
		if (!this.win) return

		this.win.webContents.send(channel, args)
	}

	public closeWindow() {
		if (!this.win) return

		this.win.close()
	}

	public async createWindow() {
		// app.on('activate')
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (this.win) {
			this.win.focus()

			return
		}

		// Create the browser window.
		this.win = new BrowserWindow({
			show: true,
			backgroundColor: "#FFFFFF",
			frame: true,
			title: "WhoIntel Layouts",
			// @ts-ignore
			icon: path.join(__static, 'icon.png'),
			minimizable: false,
			resizable: true,
			maximizable: false,
			width: 1250,
			height: 900,
			webPreferences: {
				nodeIntegration: true,
				enableRemoteModule: true,
			}
		})

		this.win.setMenu(null)

		this.win.once('ready-to-show', () => {
			if (!this.win) return

			// this.win.maximize()
			// this.win.show()
			this.win.focus()
		})

		this.win.on('closed', () => {
			this.win = null
			log.debug("LayoutsWindow: cleaning 'win'")
		})

		if (process.env.WEBPACK_DEV_SERVER_URL) {
			// Load the url of the dev server if in development mode
			await this.win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string + URL_POSTFIX)
			// if (!process.env.IS_TEST) this.win.webContents.openDevTools()
		} else {
			// Load the index.html when not in development
			await this.win.loadURL("app://./index.html" + URL_POSTFIX)
		}
	}
}

const layoutsWindow = new LayoutsWindow()

export default layoutsWindow
