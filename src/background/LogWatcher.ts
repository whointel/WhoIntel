import {EventEmitter} from "events"
import path from "path"
import fs from "fs"
import * as log from "electron-log"
import * as normalizePath from "normalize-path"
import differenceInHours from "date-fns/differenceInHours"
import Timeout = NodeJS.Timeout
import {Subscription, of} from "rxjs"
import {delay, repeat, tap} from "rxjs/operators"

const FILES_POLLING_INTERVAL = 300

export default class LogWatcher extends EventEmitter {
	private dirWatcher: fs.FSWatcher | null = null
	private files = new Set()
	private filesWatched = new Map()
	private readonly filesPoolingForCleaningInterval: Timeout
	private filesPoolingSubscription$: Subscription | null = null

	constructor(dir: string) {
		super()
		const startResult = this.watchDir(dir)
		if (!startResult) {
			throw new Error(`${dir} is not a dir`)
		}

		const filesPooling$ = of({}).pipe(
			tap(_ => {
				this.filesPooling()
			}),
			delay(FILES_POLLING_INTERVAL),
			repeat()
		)

		setTimeout(_ => this.filesPoolingSubscription$ = filesPooling$.subscribe(), FILES_POLLING_INTERVAL)

		this.filesPoolingForCleaningInterval = setInterval(this.filesPoolingForCleaning.bind(this), 1000 * 60 * 60)
	}

	private watchDir(dir: string): boolean {
		dir = normalizePath(dir)

		if (!fs.existsSync(dir)) {
			return false
		}

		const stats = fs.statSync(dir)
		if (!stats.isDirectory()) {
			return false
		}

		this.dirWatcher = fs.watch(dir, (eventType, filename) => {
			log.debug(`LogWatcher:watch:event:${eventType}:`, filename)

			const filepath = normalizePath(dir + path.sep + filename)

			if (!fs.existsSync(filepath)) {
				log.debug(`LogWatcher:watch:delete:`, filename)
				this.files.delete(filepath)
				this.unwatch(filepath)
				return
			}

			if (this.files.has(filepath)) {
				return
			}

			const stats = fs.statSync(filepath)
			if (!stats.isFile()) {
				return
			}

			this.files.add(filepath)

			this.emit("add", filepath, stats)
		})

		setTimeout(() => {
			const files = fs.readdirSync(dir)
			const nowDate = new Date()
			files.forEach(filename => {
				const filepath = normalizePath(dir + path.sep + filename)
				const stats = fs.statSync(filepath)
				if (!stats.isFile()) {
					return
				}

				const diffH = differenceInHours(nowDate, stats.mtime)
				if (diffH > 24) {
					log.info(`LogWatcher:init:ignoring:diffH=${diffH}:`, filepath)
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
				if (stats_new.size !== stats.size) {
					this.filesWatched.set(filepath, stats_new)
					this.emit("change", filepath, stats_new)
				}
			} catch (e) {
				log.warn(`LogWatcher:filesPooling:unwatch:${filepath}:error:`, e)
				this.unwatch(filepath)
			}
		})
	}

	private filesPoolingForCleaning() {
		const nowDate = new Date()
		this.filesWatched.forEach((stats, filepath) => {
			const diffH = differenceInHours(nowDate, stats.mtime)
			if (diffH > 24) {
				log.info(`LogWatcher:cleaning:diffH=${diffH}:`, filepath)
				this.unwatch(filepath)
			}
		})
	}

	unwatch(filepath) {
		filepath = normalizePath(filepath)
		if (this.filesWatched.delete(filepath)) {
			this.emit("unwatch", filepath)
		}
		this.files.delete(filepath)
	}

	close() {
		if (this.filesPoolingSubscription$) this.filesPoolingSubscription$.unsubscribe()
		clearInterval(this.filesPoolingForCleaningInterval)
		if (this.dirWatcher) {
			this.dirWatcher.close()
			this.dirWatcher = null
		}
		this.filesWatched.forEach((stats, filepath) => this.unwatch(filepath))
		this.files.clear()
	}
}
