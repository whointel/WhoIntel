import {app, BrowserWindow, ipcMain, IpcMainInvokeEvent, protocol, ProtocolRequest} from "electron"
import * as crypto from "crypto"
import base64url from "base64url"
import axios from "axios"
import * as url from "url"
import * as querystring from "querystring"
import jwt from "jsonwebtoken"
import jwksClient from "jwks-rsa"
import * as log from "electron-log"
import {AUTH_ERROR, AUTH_STATUSES, IAuthBackend, IAuthToken} from "@/types/Auth"
import VError from "verror"

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
	resultPromiseResolve: ((value: IAuthBackend) => void) | null = null
	resultPromiseReject: ((reason: VError) => void) | null = null

	async processAuthToken(request: ProtocolRequest) {
		this.authStatus = AUTH_STATUSES.PROGRESS

		if (this.authWindow) {
			this.authWindow.close()
		}

		try {
			const responseURL = url.parse(request.url, true)
			const code = responseURL.query.code
			const state = responseURL.query.state
			if (state !== this.authState) {
				throw new Error("state doesn't match")
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

			const refresh_token = data.refresh_token
			const access_token = data.access_token

			const token: IAuthToken = await this.verifyToken(access_token)

			this.resultPromiseResolve!({
				refresh_token,
				access_token,
				token,
			})
		} catch (e) {
			const error = new VError({
				name: AUTH_ERROR.PROCESS_AUTH_TOKEN,
				cause: e,
			}, "processAuthToken failed")
			this.resultPromiseReject!(error)
			log.error("AuthEVE:", error)
			return
		}
	}

	async openAuthWindow() {
		return new Promise<any>((resolve, reject) => {
			this.resultPromiseReject = reject
			this.resultPromiseResolve = resolve
			if (this.authWindow) {
				this.authWindow.focus()
				reject(new VError({
						name: AUTH_ERROR.ALREADY_IN_PROGRESS,
					}, "already in progress")
				)
				return
			}

			// this.sendAuthStatus(AUTH_STATUSES.INIT)
			this.authStatus = AUTH_STATUSES.INIT

			this.authWindow = new BrowserWindow({
				width: 800,
				height: 700,
				webPreferences: {
					nodeIntegration: false, // disabling nodeIntegration for security.
					contextIsolation: true, // enabling contextIsolation for security.
					// see https://github.com/electron/electron/blob/master/docs/tutorial/security.md
				},
			})

			this.authWindow.setMenu(null)

			this.authState = base64url(crypto.randomBytes(32))

			this.authWindow.on("closed", () => {
				this.authWindow = null
				if (this.authStatus !== AUTH_STATUSES.PROGRESS) {
					reject(new VError({
						name: AUTH_ERROR.CANCEL,
					}, "auth window closed"))
				}
				this.authStatus = AUTH_STATUSES.NONE
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
		})
	}

	init() {
		protocol.registerHttpProtocol(
			REDIRECT_URI_SCHEME,
			this.processAuthToken.bind(this)
		)

		ipcMain.handle("auth:EVE", this.openAuthWindow.bind(this))
		ipcMain.handle("auth:EVE:refresh", this.refreshAuth.bind(this))
	}

	private async verifyToken(access_token: string): Promise<IAuthToken> {
		const client = jwksClient({
			jwksUri: "https://login.eveonline.com/oauth/jwks",
		})

		const token: IAuthToken = jwt.decode(access_token) as IAuthToken

		if (!token) {
			throw new Error("Can't decode access_token to jwt")
		}

		const key = await client.getSigningKey(token.kid)

		const signingKey = key.getPublicKey()

		jwt.verify(access_token, signingKey, {
			issuer: "login.eveonline.com",
		})

		return token
	}

	async refreshAuth(event: IpcMainInvokeEvent, old_refresh_token: string | null): Promise<IAuthBackend> {
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

			const refresh_token = data.refresh_token as string
			const access_token = data.access_token as string

			const token: IAuthToken = await this.verifyToken(access_token)

			return {
				refresh_token,
				access_token,
				token,
			}
		} catch (e) {
			const error = new VError({
				name: AUTH_ERROR.REFRESH_AUTH,
				cause: e,
			}, "refreshAuth failed")
			log.error("AuthEVE:", error)
			throw error
		}
	}
}
