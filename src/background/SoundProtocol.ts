import {protocol} from "electron"
import {URL} from "url"
import base64url from "base64url"
import {getAsses} from "@/background/Assets"
import * as log from "electron-log"
import fs from "fs"

const scheme = "sound"

export const registerSoundProtocol = () => {
	protocol.registerFileProtocol(
		scheme,
		(request, respond) => {
			const base64Path = new URL(request.url).hostname
			let filepath = base64url.decode(base64Path)

			log.info("SoundProtocol: file request:", filepath)

			if (filepath !== "default") {
				if (!fs.existsSync(filepath)) {
					log.warn("SoundProtocol: file not exists:", filepath)
					filepath = "default"
				}
			}

			if (filepath === "default") {
				respond(getAsses("alarm.wav"))
			} else {
				respond(filepath)
			}
		}
	)
}
