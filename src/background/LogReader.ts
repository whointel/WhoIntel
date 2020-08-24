import {app, ipcMain, IpcMainEvent} from "electron"
import LogWatcher from "@/background/LogWatcher"
import fs from "fs"
import parse from "date-fns/parse"
import {ILogEntry, LOG_ENTRY_TYPE} from "@/types/ILogEntry"
import * as path from "path"
import mainWindow from "@/background/MainWindow"
import * as log from "electron-log"
import * as crypto from "crypto"
import readline from "readline";

interface IFileReaderFileWatch {
	shift: number
	filename: string
	filepath: string
	type: LOG_ENTRY_TYPE
	channel: string
	character: string | null
}

interface IFileReaderQueue {
	start: number
	end: number
	watchedFile: IFileReaderFileWatch
}

const queue: IFileReaderQueue[] = []
const msgRegex = /^\[ (?<datetime>\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}) \] (?<username>[^>]+) > (?<message>.+)/
const LOCAL_FILE_NAMES = ["Local", "Lokal", "Локальный"]
const DOCUMENTS_PATH = app.getPath("documents")
export const EVE_LOG_FOLDER = [DOCUMENTS_PATH, "EVE", "logs", "Chatlogs/"].join("/")

export default class LogListener {
	private channels: string[] = []
	private watcher: LogWatcher | null = null
	private filesWatched: Map<string, IFileReaderFileWatch> = new Map()

	constructor() {
		ipcMain.on("logReader:setChannels", this.setChannels.bind(this))
	}

	setChannels(event: IpcMainEvent, channels) {
		this.channels = LOCAL_FILE_NAMES.concat(channels)
		this.reStartFileListener()
	}

	reStartFileListener() {
		log.info("LogListener: restarting", this.channels)

		this.filesWatched.clear()

		if (this.watcher) {
			this.watcher.close()
			this.watcher = null
		}

		try {
			this.watcher = new LogWatcher(EVE_LOG_FOLDER)
		} catch (e) {
			// TODO notify frontend
			log.warn("LogListener:", e.message)
			return
		}

		this.watcher
			.on("unwatch", filepath => {
				log.info("LogListener: unwatch file", filepath)
				this.filesWatched.delete(filepath)
			})
			.on("add", async (filepath, stats) => {
					if (!stats) {
						log.warn(`LogListener: File has no stats`, filepath)
						return
					}

					if (!this.watcher) {
						log.warn("LogListener: no watcher")
						return
					}

					const filename = path.basename(filepath)
					const file_name_parts = filename.split("_")
					const channel = file_name_parts[0]

					if (!this.channels.includes(channel)) {
						log.info("LogListener: File ignored", filepath)
						return
					}

					this.watcher.watch(filepath)

					const isLocalType = LOCAL_FILE_NAMES.includes(channel)

					this.filesWatched.set(filepath, {
						shift: stats.size,
						filename: filename,
						filepath: filepath,
						type: isLocalType ? LOG_ENTRY_TYPE.LOCAL : LOG_ENTRY_TYPE.SECURE,
						channel: channel,
						character: null,
					})
					log.info("LogListener: added", filepath, stats.size)
				}
			)
			.on("change", async (filepath, stats) => {
					if (!stats) {
						log.warn("LogListener: change: no stats", filepath)
						return
					}

					const watchedFile = this.filesWatched.get(filepath)

					if (!watchedFile) {
						log.warn("LogListener: change: no init data", filepath)
						return
					}

					log.info(`LogListener: changed ${watchedFile.shift} -> ${stats.size}`, watchedFile.filename)

					if (stats.size > watchedFile.shift) {
						queue.push({
							start: watchedFile.shift,
							end: stats.size,
							watchedFile: watchedFile,
						})
					}

					watchedFile.shift = stats.size

					this.processQueue()
				}
			)
	}

	parseMessage(msg: string, watchedFile: IFileReaderFileWatch) {
		log.debug("LogListener: => " + msg)

		const matchResult = msg.match(msgRegex)
		if (
			!matchResult
			|| !matchResult.groups
		) {
			return
		}

		const dd = parse(matchResult.groups.datetime + " +00", "uuuu.MM.dd HH:mm:ss x", new Date())

		const message = matchResult.groups.message

		const data: ILogEntry = {
			ts: dd,
			sender: matchResult.groups.username,
			character: watchedFile.character,
			message: message,
			channel: watchedFile.channel,
			systems: [],
			hash: crypto.createHash("md5").update(msg).digest("hex"),
			type: watchedFile.type,
		}

		mainWindow.send("logReader:entry", data)
	}

	async processQueue() {
		let buffer = ""

		if (queue.length < 1) {
			return
		}

		const block = queue.shift()
		if (!block) return

		if (block.end <= block.start) {
			log.error(`LogListener: blocks error: block.start ${block.start}: block.end ${block.end}`)
			return
		}

		if (block.watchedFile.character === null) {
			const streamCharacterSync = fs.createReadStream(block.watchedFile.filepath, {encoding: "utf16le"})
			const lineReaderCharacterSync = readline.createInterface({
				input: streamCharacterSync,
			})
			for await (const line of lineReaderCharacterSync) {
				const matchResult = (line as string).match(/^ *Listener: *(?<character>.+)/)
				if (
					!matchResult
					|| !matchResult.groups
				) {
					continue
				}

				block.watchedFile.character = matchResult.groups.character
				break
			}
			streamCharacterSync.close()
		}

		const stream = fs.createReadStream(block.watchedFile.filepath, {start: block.start, end: block.end, encoding: "utf16le"})

		stream.on("error", (error) => {
			log.error(`LogListener: stream error: ${error}`)

			if (buffer.length > 0) {
				this.parseMessage(buffer, block.watchedFile)
				buffer = ""
			}
			this.processQueue()
		})

		stream.on("end", () => {
			if (buffer.length > 0) {
				this.parseMessage(buffer, block.watchedFile)
				buffer = ""
			}
			this.processQueue()
		})

		stream.on("data", (data) => {
			buffer += data
			const parts = buffer.split("\n")
			buffer = (parts.pop() || "").trim()
			for (const chunk of parts) {
				this.parseMessage(chunk.trim(), block.watchedFile)
			}
		})
	}
}
