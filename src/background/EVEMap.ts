import {app, ipcMain} from "electron"
import axios from "axios"
import * as https from "https"

class EVEMap {
	init() {
		ipcMain.handle("downloadMap", EVEMap.downloadMap)
	}

	private static async downloadMap(event, regionName: string) {
		const agent = new https.Agent({
			rejectUnauthorized: false
		})
		const {data} = await axios.get(`https://evemaps.dotlan.net/svg/${regionName}.svg`, {
			httpsAgent: agent,
			headers: {
				"user-agent": `WhoIntel/${app.getVersion()}`,
			},
		})

		return data
	}
}

const eveMap = new EVEMap()

export default eveMap
