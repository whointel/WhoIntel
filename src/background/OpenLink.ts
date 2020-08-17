import {BrowserWindow, ipcMain} from "electron"
import * as log from "electron-log"

export default class OpenLink {
	init() {
		ipcMain.on("openLink", async (event, arg) => {
			log.debug("openLink", arg)
			const window = new BrowserWindow({
				width: 1250,
				height: 700,
				webPreferences: {
					nodeIntegration: false, // disabling nodeIntegration for security.
					contextIsolation: true, // enabling contextIsolation for security.
					// see https://github.com/electron/electron/blob/master/docs/tutorial/security.md
				},
			})

			window.setMenu(null)
			window.loadURL(arg)
		})
	}
}
