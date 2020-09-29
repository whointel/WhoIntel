import EVESystem from "@/lib/EVESystem"
import { watch} from "@vue/composition-api"
import {AUTH_STATUSES} from "@/types/Auth"
import {ipcRenderer} from "electron"
import * as log from "electron-log"
import db, {IAuthExport} from "@/service/Database"
import {from, interval, of, Subscription} from "rxjs"
import {concatMap, delayWhen, repeat, tap} from "rxjs/operators"
import {ClearAuth, EVEApi} from "@/lib/EVEApi"
import {retryBackoff} from "backoff-rxjs"

export default class Character extends EVEApi {
	name: string = ""
	location: EVESystem | null = null

	refreshSubscription$: Subscription | null = null

	constructor(name: string) {
		super()

		this.name = name
		watch(() => this.auth, (auth) => {
			this.auth.isAuthed = !!auth.token

			if (auth.token) {
				const part = auth.token.sub.split(":")[2]
				this.auth.character_id = Number(part)

				this.name = auth.token.name
				this.axios$.defaults.headers.common["Authorization"] = `Bearer ${auth.access_token}`
			} else {
				this.axios$.defaults.headers.common["Authorization"] = null
			}
			this.saveDB()

		}, {deep: true})
	}

	async logout() {
		this.stopRefreshSubscription()
		Object.assign(this.auth, ClearAuth, {character_id: this.auth.character_id})
	}

	private stopRefreshSubscription() {
		if (this.refreshSubscription$) this.refreshSubscription$.unsubscribe()
	}

	async login() {
		this.stopRefreshSubscription()
		try {
			this.auth.authStatus = AUTH_STATUSES.PROGRESS
			const auth = await ipcRenderer.invoke("auth:EVE")
			this.setTokens(auth)
		} catch (error) {
			await this.logout()
			this.auth.authError = error
			this.auth.authStatus = AUTH_STATUSES.ERROR
		}
	}

	private async saveDB() {
		if (!this.auth.character_id) return

		if (!this.auth.token) {
			await (await db()).delete("auth", this.auth.character_id)
			return
		}

		await (await db()).put("auth", {
			character_id: this.auth.character_id,
			refresh_token: this.auth.refresh_token!,
			access_token: this.auth.access_token!,
			token: this.auth.token!,
		})
	}

	setTokens(auth: IAuthExport) {
		this.stopRefreshSubscription()

		Object.assign(this.auth, {
			refresh_token: auth.refresh_token,
			access_token: auth.access_token,
			token: auth.token,
			authStatus: AUTH_STATUSES.AUTH
		})

		const poll$ = of({}).pipe(
			delayWhen(_ => {
					const refreshAt = new Date((this.auth.token!.exp - (2 * 60)) * 1000)
					log.info(`Character:${this.name}:refreshToken:delay:`, refreshAt)
					return interval(refreshAt.getTime() - (new Date().getTime()))
				}
			),
			concatMap(() => {
				log.info(`Character:${this.name}:refreshToken:process`)
				return from(ipcRenderer.invoke("auth:EVE:refresh", this.auth.refresh_token))
			}),
			retryBackoff({
				initialInterval: 50,
				maxInterval: 60_000,
				maxRetries: 1000,
				resetOnSuccess: true,
			}),
			tap((auth: any) => {
				Object.assign(this.auth, {
					refresh_token: auth.refresh_token,
					access_token: auth.access_token,
					token: auth.token,
					authStatus: AUTH_STATUSES.AUTH,
					authError: null,
				})
			}),
			repeat()
		)

		this.refreshSubscription$ = poll$.subscribe({
			error: (error) => {
				log.error(`Character:${this.name}:refreshToken:error`, error)
				this.auth.authError = error
				this.auth.authStatus = AUTH_STATUSES.ERROR
			}
		})
	}
}
