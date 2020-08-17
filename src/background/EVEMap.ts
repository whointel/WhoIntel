import {app, ipcMain} from "electron"
import axios from "axios"

class EVEMap {
	init() {
		ipcMain.handle("downloadMap", EVEMap.downloadMap)
	}

	private static async downloadMap(event, regionName: string) {
		const {data} = await axios.get(`https://evemaps.dotlan.net/svg/${regionName}.svg`, {
			headers: {
				"user-agent": `WhoIntel/${app.getVersion()}`,
			}
		})

		return data
	}
}

const eveMap = new EVEMap()

export default eveMap
