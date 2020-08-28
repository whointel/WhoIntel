import events from "@/service/EventBus"
import {ipcRenderer} from "electron"
import axios, {AxiosError, AxiosResponse} from "axios"
import Timeout = NodeJS.Timeout
import differenceInMilliseconds from "date-fns/differenceInMilliseconds"
import {AUTH_STATUSES, IAuthStatus} from "@/types/AuthStatuses"
import * as log from "electron-log"
import {
	API_CHARACTER_LOCATION,
	API_CHARACTER_ONLINE,
	API_CHARACTER_SHIP,
	API_FLEET,
	API_FLEET_MEMBER,
	API_KILLMAIL,
	API_STATUS, API_STRUCTURE,
	API_SYSTEM_JUMPS,
	API_SYSTEM_KILLS,
	IAPICharacter
} from "@/types/API"
import Axios from "axios-observable"
import {AxiosObservable} from "axios-observable/lib/axios-observable.interface"
import {reactive, UnwrapRef, watch, watchEffect} from "@vue/composition-api"
import {interval, Observable, of} from "rxjs"
import {concatMap, delayWhen, map, repeat, tap} from "rxjs/operators"
import {retryBackoff, RetryBackoffConfig} from "backoff-rxjs"
import store from "@/store"
import Vue from "vue"

const API_BASE_URL = "https://esi.evetech.net/latest/"

const REFRESH_TOKEN_PREDICTION_MINUTES = 2

interface IEVEAPIAuth {
	refresh_token: string | null
	access_token: string | null
	token: null | {
		azp: string
		exp: number
		iss: string
		jti: string
		kid: string
		name: string
		owner: string
		scp: string[]
		sub: string
	}
	authStatus: AUTH_STATUSES
	authError: any

	isAuth: boolean
	character_id: number | null
}

interface API_POLL_OPTIONS {
	name?: string // name for log
	interval?: number // interval in ms, default use expire header
	backoff?: RetryBackoffConfig
}

const regularRetryBackoffConfig = {
	initialInterval: 10,
	maxInterval: 1000,
	maxRetries: 5,
	resetOnSuccess: true,
	shouldRetry: axiosShouldRetryOnServerError,
}

class EVEApi {
	auth!: UnwrapRef<IEVEAPIAuth>
	refreshTimer: Timeout | null = null

	private axios$ = Axios.create({
		baseURL: API_BASE_URL
	})

	logout() {
		this.stopRefreshTimer()

		Object.assign(this.auth, {
			refresh_token: null,
			access_token: null,
			token: null,
			authStatus: AUTH_STATUSES.NONE
		})

		localStorage.removeItem("auth")
	}

	login() {
		ipcRenderer.send("auth:EVE")
	}

	refreshToken() {
		log.info("EVEApi: refreshToken start")
		ipcRenderer.send("auth:EVE:refresh", this.auth.refresh_token)
		// TODO refresh timer
	}

	readStoredAuth() {
		const authFromStore = localStorage.getItem("auth")
		if (!authFromStore) return

		let auth
		try {
			auth = JSON.parse(authFromStore)
		} catch (e) {
			return
		}

		if (!auth) return

		Object.assign(this.auth, {
			refresh_token: auth.refresh_token,
			access_token: auth.access_token,
			token: auth.token,
			authStatus: AUTH_STATUSES.AUTH
		})

		this.startRefreshTimer()
	}

	init() {
		// Vue.observable
		this.auth = reactive({
			refresh_token: null,
			access_token: null,
			token: null,
			authStatus: AUTH_STATUSES.NONE,
			authError: null,
			isAuth: false,
			character_id: null,
		})

		// watchEffect(() => {
		// 	this.auth.isAuth = !!this.auth?.token
		// 	// events.$emit("auth", this.auth.isAuth)
		// })
		// watchEffect(() => {
		// 	const part = this.auth.token?.sub?.split(":")[2]
		//
		// 	this.auth.character_id = part ? Number(part) : null
		// })
		// watchEffect(() => {
		// 	this.axios$.defaults.headers.common["Authorization"] = `Bearer ${this.auth.access_token}`
		// })

		watch(() => this.auth.token, (token) => {
			this.auth.isAuth = !!token

			const part = token?.sub?.split(":")[2]
			this.auth.character_id = part ? Number(part) : null

			this.axios$.defaults.headers.common["Authorization"] = `Bearer ${this.auth.access_token}`
		})

		events.$on("electron:auth:EVE", this.onAuthEVE.bind(this))
		this.readStoredAuth()
	}

	startRefreshTimer() {
		if (!this.auth.token || !this.auth.token.exp) return

		// @ts-ignore
		const tokenRefreshTimeout = differenceInMilliseconds(new Date(this.auth.token.exp * 1000), new Date())
		let tokenRefreshTimeoutPrediction = tokenRefreshTimeout - REFRESH_TOKEN_PREDICTION_MINUTES * 60 * 1000
		log.debug(`EVEApi: startRefreshTimer, tokenRefreshTimeout=${tokenRefreshTimeout}, tokenRefreshTimeoutPrediction=${tokenRefreshTimeoutPrediction}`)
		if (tokenRefreshTimeoutPrediction < 0) {
			tokenRefreshTimeoutPrediction = 0
		}
		log.info(`EVEApi: next refresh access_token in ${tokenRefreshTimeoutPrediction / 1000} sec`)
		this.refreshTimer = setTimeout(this.refreshToken.bind(this), tokenRefreshTimeoutPrediction)
	}

	stopRefreshTimer() {
		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer)
		}
	}

	private onAuthEVE(event, data: IAuthStatus) {
		this.auth.authStatus = data.status

		switch (data.status) {
			case AUTH_STATUSES.AUTH:
				if (!data.auth) {
					this.auth.authStatus = AUTH_STATUSES.ERROR
					this.auth.authError = data.error || "unknown"
					return
				}

				localStorage.setItem("auth", JSON.stringify(data.auth))

				Object.assign(this.auth, {
					refresh_token: data.auth.refresh_token,
					access_token: data.auth.access_token,
					token: data.auth.token,
					authStatus: AUTH_STATUSES.AUTH,
					authError: null,
				})

				this.startRefreshTimer()
				break
			case AUTH_STATUSES.ERROR:
				this.auth.authError = data.error
				break
		}
	}

	private checkScope(scope: string) {
		if (!this.auth?.isAuth || !this.auth.token?.scp) {
			throw new Error("API call for undefined user")
		}

		if (!this.auth.token.scp.includes(scope)) {
			store.commit("setError", `You need logout and login with new permission scope (${scope})`)
			throw new Error(`API scope needed: ${scope}`)
		}
	}

	character_online$(): AxiosObservable<API_CHARACTER_ONLINE> {
		this.checkScope("esi-location.read_online.v1")

		return this.axios$.get<API_CHARACTER_ONLINE>(`characters/${this.auth.character_id}/online/`)
	}

	character_ship$(): AxiosObservable<API_CHARACTER_SHIP> {
		this.checkScope("esi-location.read_ship_type.v1")

		return this.axios$.get<API_CHARACTER_SHIP>(`characters/${this.auth.character_id}/ship/`)
	}

	character_location$(): AxiosObservable<API_CHARACTER_LOCATION> {
		this.checkScope("esi-location.read_location.v1")

		return this.axios$.get<API_CHARACTER_LOCATION>(`characters/${this.auth.character_id}/location/`)
	}

	status$(): AxiosObservable<API_STATUS> {
		return this.axios$.get<API_STATUS>("status/")
	}

	system_kills$(): AxiosObservable<API_SYSTEM_KILLS[]> {
		return this.axios$.get<API_SYSTEM_KILLS[]>("universe/system_kills/")
	}

	system_jumps$(): AxiosObservable<API_SYSTEM_JUMPS[]> {
		return this.axios$.get<API_SYSTEM_JUMPS[]>("universe/system_jumps/")
	}

	searchStructure$(search: string, strict = true): AxiosObservable<{ structure: number[] }> {
		this.checkScope("esi-search.search_structures.v1")

		return this.axios$.get<{ structure: number[] }>(
			`characters/${this.auth.character_id}/search/`,
			{
				params: {
					categories: "structure",
					search: search,
					strict: strict,
				}
			}
		).pipe(
			retryBackoff(regularRetryBackoffConfig),
		)
	}

	getMyFleet$(): AxiosObservable<API_FLEET> {
		this.checkScope("esi-fleets.read_fleet.v1")

		return this.axios$.get<API_FLEET>(`characters/${this.auth.character_id}/fleet/`).pipe(
			retryBackoff(regularRetryBackoffConfig),
		)
	}

	getFleetMembers$(fleet_id: number): AxiosObservable<API_FLEET_MEMBER[]> {
		this.checkScope("esi-fleets.read_fleet.v1")

		return this.axios$.get<API_FLEET_MEMBER[]>(`fleets/${fleet_id}/members/`).pipe(
			retryBackoff(regularRetryBackoffConfig),
		)
	}

	searchCharacter$(name: string): AxiosObservable<{ character: Array<number> }> {
		return this.axios$.get<{ character: Array<number> }>("search/", {
			params: {
				categories: "character",
				search: name,
				strict: true,
			}
		}).pipe(
			retryBackoff(regularRetryBackoffConfig),
		)
	}

	getCharacter$(id: number): AxiosObservable<IAPICharacter> {
		return this.axios$.get<IAPICharacter>(`characters/${id}/`).pipe(
			retryBackoff(regularRetryBackoffConfig),
		)
	}

	getStructure$(id: number): AxiosObservable<API_STRUCTURE> {
		return this.axios$.get<API_STRUCTURE>(`universe/structures/${id}/`).pipe(
			retryBackoff({
				initialInterval: 10,
				maxInterval: 1000,
				maxRetries: 10,
				resetOnSuccess: true,
				shouldRetry: axiosShouldRetryOnServerError,
			}),
		)
	}

	async setWaypoint(destination_id: number, clear_other_waypoints: boolean = true, add_to_beginning: boolean = false) {
		this.checkScope("esi-ui.write_waypoint.v1")

		return this.axios$.post(
			"ui/autopilot/waypoint",
			null, {
				params: {
					destination_id,
					clear_other_waypoints,
					add_to_beginning,
				}
			}
		).pipe(
			tap(() => {
				events.$emit("api:start")
			}),
			retryBackoff(regularRetryBackoffConfig),
			tap(() => {
				events.$emit("api:end")
			}, (e) => {
				events.$emit("api:end", e)
			}),
		).toPromise()
	}

	killmail$(killmail_id: number, killmail_hash: string): AxiosObservable<API_KILLMAIL> {
		return this.axios$.get<API_KILLMAIL>(`killmails/${killmail_id}/${killmail_hash}/`).pipe(
			retryBackoff(regularRetryBackoffConfig),
		)
	}
}

const api = new EVEApi()

export default api

function axiosShouldRetryOnServerError(error: AxiosError) {
	const code = Number(error.response?.status)
	return code > 0 && (code >= 500 && code <= 504)
}

export function extractExpires(response: AxiosResponse): Date {
	if (!response.headers.expires) {
		throw new Error("no expires header")
	}

	return new Date(response.headers.expires)
}

/**
 * @return milliseconds
 */
export function expireIn(response: AxiosResponse): number {
	const expires = extractExpires(response)

	return differenceInMilliseconds(expires, new Date())
}

export function apiPoll<T>(api$: AxiosObservable<T>, options: API_POLL_OPTIONS = {}): Observable<T | null> {
	return apiPollResponse(api$, options).pipe(
		map(response => response.data)
	)
}

export function apiPollResponse<T>(api$: AxiosObservable<T>, options: API_POLL_OPTIONS = {}): Observable<AxiosResponse<T> | { data: null }> {
	return new Observable(observer => {
		let expireInMs: any = null

		const poll$ = of({}).pipe(
			concatMap(_ => api$),
			tap({
				error: (error) => {
					if (axiosShouldRetryOnServerError(error)) {
						log.debug(`EVEApi:poll:${options.name}:error:`, error.message)
					} else {
						log.debug(`EVEApi:poll:${options.name}:error:`, error)
					}
					observer.next({data: null})
				}
			}),
			retryBackoff(options.backoff || {
				initialInterval: 500,
				maxInterval: 20000,
				resetOnSuccess: true,
			}),
			tap((response: AxiosResponse<T>) => {
				expireInMs = expireIn(response)
				observer.next(response)
			}),
			delayWhen(_ => {
					if (options.interval) {
						return interval(options.interval)
					}

					const jitter = Math.random() * 2000
					console.debug(`EVEApi:poll:${options.name}:delay:`, new Date(new Date().getTime() + expireInMs + jitter))
					return interval(expireInMs + jitter)
				}
			),
			repeat()
		)

		const pollSubscription = poll$.subscribe()

		return (): void => {
			pollSubscription.unsubscribe()
		}
	})
}
