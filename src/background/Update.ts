import {autoUpdater} from "electron-updater"
import mainWindow from "@/background/MainWindow"
import {ipcMain} from "electron"
import {UPDATE_STATUSES} from "@/types/UpdateStatuses"
import * as log from "electron-log"

autoUpdater.logger = log
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

let status: UPDATE_STATUSES = UPDATE_STATUSES.UPDATE_NOT_AVAILABLE

function sendStatusToWindow(status: UPDATE_STATUSES, data: any = {}) {
	mainWindow.send("update", {
		status, data,
	})
}

autoUpdater.on("checking-for-update", () => {
	sendStatusToWindow(UPDATE_STATUSES.CHECKING_FOR_UPDATE)
	status = UPDATE_STATUSES.CHECKING_FOR_UPDATE
})

autoUpdater.on("error", (error) => {
	sendStatusToWindow(UPDATE_STATUSES.ERROR, {
		error,
	})
	status = UPDATE_STATUSES.UPDATE_NOT_AVAILABLE
})

autoUpdater.on("update-available", (update) => {
	sendStatusToWindow(UPDATE_STATUSES.UPDATE_AVAILABLE, {
		version: update.version,
	})
	status = UPDATE_STATUSES.UPDATE_AVAILABLE
})

autoUpdater.on("update-not-available", () => {
	sendStatusToWindow(UPDATE_STATUSES.UPDATE_NOT_AVAILABLE)
	status = UPDATE_STATUSES.UPDATE_NOT_AVAILABLE
})

autoUpdater.on("update-downloaded", () => {
	sendStatusToWindow(UPDATE_STATUSES.UPDATE_DOWNLOADED)
	status = UPDATE_STATUSES.UPDATE_DOWNLOADED
})

ipcMain.on("update:status", async (event, arg) => {
	event.reply({
		status: status,
	})
})

ipcMain.on("update:check", async (event, arg) => {
	checkUpdate()
})

ipcMain.on("update:install", async (event, arg) => {
	quitAndInstall()
})

ipcMain.on("update:download", async (event, arg) => {
	download()
})

function quitAndInstall() {
	setImmediate(() => autoUpdater.quitAndInstall(false, true))
	mainWindow.setQuiting()
}

function download() {
	sendStatusToWindow(UPDATE_STATUSES.UPDATE_DOWNLOADING)
	status = UPDATE_STATUSES.UPDATE_DOWNLOADING
	autoUpdater.downloadUpdate()
}

function checkUpdate() {
	autoUpdater.checkForUpdates()
}

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000

export function checkUpdatePeriodical() {
	setInterval(checkUpdate, ONE_DAY_IN_MS)
}
