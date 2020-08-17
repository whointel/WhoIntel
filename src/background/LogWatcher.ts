import {EventEmitter} from "events"
import path from "path"
import fs from "fs"
import * as log from "electron-log"
import * as normalizePath from "normalize-path"
import differenceInHours from "date-fns/differenceInHours"
import Timeout = NodeJS.Timeout

export default class LogWatcher extends EventEmitter {
	private dirWatcher: fs.FSWatcher | null = null
	private files = new Set()
	private filesWatched = new Map()
	private readonly filesPoolingInterval: Timeout
	private readonly filesPoolingForCleaningInterval: Timeout

	constructor(dir: string) {
		super()
		const startResult = this.watchDir(dir)
		if (!startResult) {
			throw new Error(`${dir} is not a dir`)
		}
		this.filesPoolingInterval = setInterval(this.filesPooling.bind(this), 300)
		this.filesPoolingForCleaningInterval = setInterval(this.filesPoolingForCleaning.bind(this), 1000 * 60 * 60)
		setTimeout(this.filesPoolingForCleaning.bind(this), 5000)
	}

	private watchDir(dir: string): boolean {
		dir = normalizePath(dir)
		const stats = fs.statSync(dir)
		if (!stats.isDirectory()) {
			return false
		}

		this.dirWatcher = fs.watch(dir, (eventType, filename) => {
			if (eventType === "rename") {
				return
			}
			const filepath = normalizePath(dir + path.sep + filename)

			if (!fs.existsSync(filepath)) {
				this.files.delete(filepath)
				return
			}

			const stats = fs.statSync(filepath)
			if (!stats.isFile()) {
				return
			}
			if (this.files.has(filepath)) {
				return
			}
			this.files.add(filepath)

			this.emit("add", filepath, stats)
		})

		setTimeout(() => {
			const files = fs.readdirSync(dir)
			files.forEach(filename => {
				const filepath = normalizePath(dir + path.sep + filename)
				const stats = fs.statSync(filepath)
				if (!stats.isFile()) {
					return
				}
				this.files.add(filepath)

				this.emit("add", filepath, stats)
			})
		}, 0)

		return true
	}

	watch(src) {
		src = normalizePath(src)

		const stats = fs.statSync(src)
		if (!stats.isFile()) return

		this.filesWatched.set(src, stats)
	}

	private filesPooling() {
		this.filesWatched.forEach((stats, filepath) => {
			try {
				const stats_new = fs.statSync(filepath)
				if (stats_new.mtimeMs !== stats.mtimeMs) {
					this.filesWatched.set(filepath, stats_new)
					this.emit("change", filepath, stats_new)
				}
			} catch (e) {
				this.unwatch(filepath)
			}
		})
	}

	private filesPoolingForCleaning() {
		const nowDate = new Date()
		this.filesWatched.forEach((stats, filepath) => {
			const diffH = differenceInHours(nowDate, stats.mtime)
			if (diffH > 24) {
				this.unwatch(filepath)
				log.info("LogWatcher: cleaning", filepath, diffH)
			}
		})
	}

	unwatch(filepath) {
		filepath = normalizePath(filepath)
		if (this.filesWatched.delete(filepath)) {
			this.emit("unwatch", filepath)
		}
	}

	close() {
		clearInterval(this.filesPoolingInterval)
		clearInterval(this.filesPoolingForCleaningInterval)
		if (this.dirWatcher) {
			this.dirWatcher.close()
			this.dirWatcher = null
		}
		this.filesWatched.forEach((stats, filepath) => this.unwatch(filepath))
	}
}
