import {app, protocol, ipcMain, shell} from "electron"
import eveMap from "@/background/EVEMap"
import installExtension, {VUEJS_DEVTOOLS} from "electron-devtools-installer"
import LogListener, {EVE_LOG_FOLDER} from "@/background/LogReader"
import OpenLink from "@/background/OpenLink"
import AuthEVE from "@/background/AuthEVE"
import createMenu from "@/background/MainWindowMenu"
import mainWindow from "@/background/MainWindow"
import TrayMenu from "@/background/Tray"
import {checkUpdatePeriodical} from "@/background/Update"
import * as log from "electron-log"
import {SDEParser} from "@/background/_SDEPParser"
import fs from "fs"
import {getAsses} from "@/background/Assets"
import {registerSoundProtocol} from "@/background/SoundProtocol"
import layoutsWindow from "@/background/LayoutsWindow"
import {dirname} from "path"
import {isPlatformMacOS, isPlatformWin} from "@/background/helpers"

log.transports.file.maxSize = 1024 * 1024 * 20; // 20Mb

// (async () => {
// 	await SDEParser()
// 	log.debug("SDEParser done")
// 	//	app.quit()
// })()
// COMMENT LINES BELOW

ipcMain.on("getSDE", async () => {
	const stargatePromise = fs.promises.readFile(getAsses("db/StarGateDB.json"), "utf8")
	const regionPromise = fs.promises.readFile(getAsses("db/RegionDB.json"), "utf8")
	const systemPromise = fs.promises.readFile(getAsses("db/SystemDB.json"), "utf8")
	const shipsPromise = fs.promises.readFile(getAsses("db/ShipsDB.json"), "utf8")
	const StarGateDB = JSON.parse(await stargatePromise)
	const RegionDB = JSON.parse(await regionPromise)
	const SystemDB = JSON.parse(await systemPromise)
	const ShipsDB = JSON.parse(await shipsPromise)
	mainWindow.send("setSDE", {SystemDB, StarGateDB, RegionDB, ShipsDB})
})

const isDevelopment = process.env.NODE_ENV !== "production"

let tray: TrayMenu
let logListener: LogListener
let openLink: OpenLink
let authEVE: AuthEVE

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([{scheme: "app", privileges: {secure: true, standard: true}}])

const contextMenu = require("electron-context-menu")
contextMenu()

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
	app.quit()
} else {
	app.on("second-instance", (event, commandLine, workingDirectory) => {
		// Someone tried to run a second instance, we should focus our window.
		log.info("second window started")
		mainWindow.show()
	})
}

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
	if (isPlatformWin) {
		process.on("message", data => {
			if (data === "graceful-exit") {
				app.quit()
			}
		})
	} else {
		process.on("SIGTERM", () => {
			app.quit()
		})
	}
}

app.on("activate", () => {
	mainWindow.createWindow()
})

// Quit when all windows are closed.
app.on("window-all-closed", () => {
	// On macOS it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	// if (!isPlatformMacOS) {
	app.quit()
	// }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", async () => {
	if (isPlatformWin) {
		app.setAppUserModelId("space.whointel.app");
	}

	if (isDevelopment && !process.env.IS_TEST) {
		try {
			await installExtension(VUEJS_DEVTOOLS)
		} catch (e) {
			console.error("Vue Devtools failed to install:", e.toString())
		}
	}

	ipcMain.on("getVersion", (event, arg) => {
		event.reply("setVersion", {
			app: app.getVersion(),
			electron: process.versions
		})
	})

	ipcMain.on("getPlatform", event => event.returnValue = process.platform)

	ipcMain.on("open:layouts", (event, arg) => {
		layoutsWindow.createWindow()
	})

	ipcMain.on("close:layouts", (event, arg) => {
		layoutsWindow.closeWindow()
	})

	ipcMain.on("sendto:main", (event, event_name, arg) => {
		mainWindow.send(event_name, arg)
	})

	ipcMain.on("sendto:layouts", (event, event_name, arg) => {
		layoutsWindow.send(event_name, arg)
	})

	ipcMain.on("openLogFolderProgram", () => {
		shell.openPath(dirname(log.transports.file.getFile().path))
	})

	ipcMain.on("openLogFolderGame", () => {
		shell.openPath(EVE_LOG_FOLDER)
	})

	eveMap.init()

	logListener = new LogListener()

	registerSoundProtocol()

	mainWindow.createWindow()

	tray = new TrayMenu()

	createMenu()

	openLink = new OpenLink()
	openLink.init()

	authEVE = new AuthEVE()
	authEVE.init()

	checkUpdatePeriodical()
})

setInterval(() => {
	const mem = process.memoryUsage()
	if (!isDevelopment) {
		log.info("memory usage", mem)
	}
	mainWindow.send("memoryUsage", mem)
}, 60_000)
