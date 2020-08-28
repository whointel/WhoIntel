import {app, BrowserWindow, ipcMain, IpcMainEvent, protocol, ProtocolRequest} from "electron"
import * as crypto from "crypto"
import base64url from "base64url"
import axios from "axios"
import * as url from "url"
import * as querystring from "querystring"
import * as jwt from "jsonwebtoken"
// import * as jwks from "jwks-rsa"
const jwksClient = require("jwks-rsa")
import * as log from "electron-log"
import mainWindow from "@/background/MainWindow"
import {AUTH_STATUSES} from "@/types/AuthStatuses"

const OAUTH_AUTHORIZE_BASE_URL = "https://login.eveonline.com/v2/oauth/authorize/?"
const OAUTH_TOKEN_URL = "https://login.eveonline.com/v2/oauth/token"

const OAUTH_CLIENT_ID = "a484a73388fb42d8a4fcd9043b888790"
const OAUTH_SCOPE = "esi-location.read_location.v1 esi-location.read_ship_type.v1 esi-search.search_structures.v1 esi-universe.read_structures.v1 esi-fleets.read_fleet.v1 esi-ui.write_waypoint.v1 esi-location.read_online.v1"

const REDIRECT_URI_SCHEME = "eveauth-local"
const REDIRECT_URI = REDIRECT_URI_SCHEME + "://callback/"

export default class AuthEVE {
	authWindow: BrowserWindow | null = null
	authState: any = null
	code_verifier: any = null
	authStatus: AUTH_STATUSES = AUTH_STATUSES.NONE

	sendAuthStatus(status: AUTH_STATUSES, error: any = null, auth: any = null) {
		this.authStatus = status
		mainWindow.send("auth:EVE", {
			status,
			error,
			auth,
		})
	}

	async processAuthToken(request: ProtocolRequest) {
		this.sendAuthStatus(AUTH_STATUSES.PROGRESS)

		if (this.authWindow) {
			this.authWindow.close()
		}

		try {
			const responseURL = url.parse(request.url, true)
			const code = responseURL.query.code
			const state = responseURL.query.state
			if (state !== this.authState) {
				this.sendAuthStatus(AUTH_STATUSES.ERROR, "Wrong auth state")
				return
			}

			const {data} = await axios.post(OAUTH_TOKEN_URL, querystring.stringify({
					grant_type: "authorization_code",
					client_id: OAUTH_CLIENT_ID,
					code: code,
					code_verifier: this.code_verifier,
				}),
				{
					headers: {
						"user-agent": `WhoIntel/${app.getVersion()}`,
					}
				})

			// const expires_in = data.expires_in
			const refresh_token = data.refresh_token
			const access_token = data.access_token

			const token = await this.verifyToken(access_token)

			this.sendAuthStatus(AUTH_STATUSES.AUTH, null,
				{
					refresh_token,
					access_token,
					token,
				}
			)
		} catch (e) {
			this.sendAuthStatus(AUTH_STATUSES.ERROR, e)
			log.error("AuthEVE:", e)
			return
		}
	}

	async openAuthWindow(event: IpcMainEvent) {
		if (this.authWindow) {
			this.authWindow.focus()
			return
		}

		this.sendAuthStatus(AUTH_STATUSES.INIT)

		this.authWindow = new BrowserWindow({
			width: 800,
			height: 700,
			webPreferences: {
				nodeIntegration: false, // disabling nodeIntegration for security.
				contextIsolation: true // enabling contextIsolation for security.
				// see https://github.com/electron/electron/blob/master/docs/tutorial/security.md
			},
		})

		this.authWindow.setMenu(null)

		this.authState = base64url(crypto.randomBytes(32))

		this.authWindow.on("closed", () => {
			this.authWindow = null
			if (this.authStatus !== AUTH_STATUSES.PROGRESS) {
				this.sendAuthStatus(AUTH_STATUSES.CANCEL)
			}
		})

		this.code_verifier = base64url(crypto.randomBytes(32))
		const challenge = base64url(
			crypto.createHash("sha256")
				.update(this.code_verifier)
				.digest()
		)

		const params = new URLSearchParams({
			response_type: "code",
			redirect_uri: REDIRECT_URI,
			client_id: OAUTH_CLIENT_ID,
			scope: OAUTH_SCOPE,
			code_challenge: challenge,
			code_challenge_method: "S256",
			state: this.authState,
		})

		this.authWindow.loadURL(OAUTH_AUTHORIZE_BASE_URL + params.toString())
	}

	init() {
		protocol.registerHttpProtocol(
			REDIRECT_URI_SCHEME,
			this.processAuthToken.bind(this)
		)
		ipcMain.on("auth:EVE", this.openAuthWindow.bind(this))
		ipcMain.on("auth:EVE:refresh", this.refreshAuth.bind(this))
	}

	private async verifyToken(access_token: string) {
		const client = jwksClient({
			jwksUri: "https://login.eveonline.com/oauth/jwks",
		})

		const token = jwt.decode(access_token)

		return new Promise((resolve, reject) => {
			client.getSigningKey(token.kid, (err, key) => {
				if (err) {
					reject(err)
					return
				}

				try {
					const signingKey = key.getPublicKey()

					jwt.verify(access_token, signingKey, {
						issuer: "login.eveonline.com",
					})
					resolve(token)
				} catch (e) {
					reject(e)
				}
			})
		})
	}

	async refreshAuth(event: IpcMainEvent, old_refresh_token: string | null) {
		try {
			const {data} = await axios.post(OAUTH_TOKEN_URL, querystring.stringify({
					grant_type: "refresh_token",
					client_id: OAUTH_CLIENT_ID,
					refresh_token: old_refresh_token,
				}),
				{
					headers: {
						"user-agent": `WhoIntel/${app.getVersion()}`,
					}
				})

			const refresh_token = data.refresh_token
			const access_token = data.access_token

			const token = await this.verifyToken(access_token)

			this.sendAuthStatus(AUTH_STATUSES.AUTH, null,
				{
					refresh_token,
					access_token,
					token,
				}
			)
		} catch (e) {
			this.sendAuthStatus(AUTH_STATUSES.ERROR, e)
			log.error("AuthEVE:", e)
			return
		}
	}
}
