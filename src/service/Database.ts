import {DBSchema, openDB} from "idb/with-async-ittr.js"
import {IEVEJumpBridgeExport} from "@/lib/EVEJumpBridge"

export interface IRegionMapExport {
	id: number
	ts: Date
	svg: string
}

export interface ICharacterExport {
	id: number
	name: string
	corporation_id: number

	expires: Date
	exists: boolean
}

interface IntelDB extends DBSchema {
	jb: {
		value: IEVEJumpBridgeExport
		key: number
	},
	regionMap: {
		value: IRegionMapExport
		key: number
	}
	regionMapDark: {
		value: IRegionMapExport
		key: number
	},
	characters: {
		value: ICharacterExport
		key: number
		indexes: { id: number, name: string, expires: Date }
	}
}

function createDB() {
	return openDB<IntelDB>("intel", 9, {
		upgrade(db, oldVersion, newVersion, transaction) {
			if (oldVersion < 1) {
				// see version 3
				// db.createObjectStore("jb", {
				// 	keyPath: "uuid",
				// 	autoIncrement: false,
				// })
			}

			if (oldVersion < 2) {
				db.createObjectStore("regionMap", {
					keyPath: "id",
					autoIncrement: false,
				})
			}

			if (oldVersion < 3) {
				// db.deleteObjectStore("jb")
				if (Array.from(transaction.objectStoreNames).includes("jb")) db.deleteObjectStore("jb")

				db.createObjectStore("jb", {
					keyPath: "structure_id",
					autoIncrement: false,
				})
			}

			if (oldVersion < 4) {
				// see version 5
				// db.createObjectStore("characters", {
				// 	autoIncrement: false,
				// })
			}

			if (oldVersion < 5) {
				// see version 6
				// db.deleteObjectStore("characters")
				// const charactersStore = db.createObjectStore("characters", {
				// 	autoIncrement: true,
				// })
				//
				// charactersStore.createIndex("id", "id")
				// charactersStore.createIndex("name", "name")
				// charactersStore.createIndex("expires", "expires")
			}

			if (oldVersion < 6) {
				// see version 7
				// db.deleteObjectStore("characters")
				// const charactersStore = db.createObjectStore("characters", {
				// 	autoIncrement: true,
				// })
				//
				// charactersStore.createIndex("id", "id")
				// charactersStore.createIndex("name", "name")
				// charactersStore.createIndex("expires", "expires")
				// // charactersStore.createIndex("character_id", "id", {unique: true}) // initial 6 version, mistake
			}

			if (oldVersion < 7) {
				// see version 8
				// db.deleteObjectStore("characters")
				// const charactersStore = db.createObjectStore("characters", {
				// 	autoIncrement: true,
				// })
				//
				// charactersStore.createIndex("id", "id")
				// charactersStore.createIndex("name", "name")
				// charactersStore.createIndex("expires", "expires")
				// charactersStore.createIndex("character_id", "id")
			}

			if (oldVersion < 8) {
				if (Array.from(transaction.objectStoreNames).includes("characters")) db.deleteObjectStore("characters")

				const charactersStore = db.createObjectStore("characters", {
					autoIncrement: true,
				})

				charactersStore.createIndex("name", "name")
				charactersStore.createIndex("expires", "expires")
				charactersStore.createIndex("id", "id")
			}

			if (oldVersion < 9) {
				db.createObjectStore("regionMapDark", {
					keyPath: "id",
					autoIncrement: false,
				})
			}
		},
	})
}

const dbInstance = createDB()

const db = function () {
	return dbInstance
}

export default db
