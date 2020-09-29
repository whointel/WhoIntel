import events from "@/service/EventBus"
import {AxiosError, AxiosResponse} from "axios"
import differenceInMilliseconds from "date-fns/differenceInMilliseconds"
import {AUTH_STATUSES, IAuth} from "@/types/Auth"
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
import {reactive} from "@vue/composition-api"
import {interval, Observable, of} from "rxjs"
import {concatMap, delayWhen, map, repeat, tap} from "rxjs/operators"
import {retryBackoff, RetryBackoffConfig} from "backoff-rxjs"
import store from "@/store"

const API_BASE_URL = "https://esi.evetech.net/latest/"

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

export const ClearAuth: IAuth = {
	refresh_token: null,
	access_token: null,
	token: null,
	authStatus: AUTH_STATUSES.NONE,
	authError: null,
	character_id: null,
	isAuthed: false,
}

export class EVEApiPublic {
	protected axios$ = Axios.create({
		baseURL: API_BASE_URL
	})

	status$(): AxiosObservable<API_STATUS> {
		return this.axios$.get<API_STATUS>("status/")
	}

	system_kills$(): AxiosObservable<API_SYSTEM_KILLS[]> {
		return this.axios$.get<API_SYSTEM_KILLS[]>("universe/system_kills/")
	}

	system_jumps$(): AxiosObservable<API_SYSTEM_JUMPS[]> {
		return this.axios$.get<API_SYSTEM_JUMPS[]>("universe/system_jumps/")
	}

	killmail$(killmail_id: number, killmail_hash: string): AxiosObservable<API_KILLMAIL> {
		return this.axios$.get<API_KILLMAIL>(`killmails/${killmail_id}/${killmail_hash}/`).pipe(
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
}

export class EVEApi extends EVEApiPublic {
	auth: IAuth = reactive(Object.assign({}, ClearAuth))

	private checkScope(scope: string) {
		if (!this.auth.isAuthed || !this.auth.token?.scp) {
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

	getStructure$(id: number): AxiosObservable<API_STRUCTURE> {
		this.checkScope("esi-universe.read_structures.v1")

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
}

const api = new EVEApiPublic()

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

				const jitter = (Math.random() * 2000) + 1000
				console.debug(`EVEApi:poll:${options.name}:delay:`, new Date(new Date().getTime() + expireInMs + jitter))
				return interval(expireInMs + jitter)
			}),
			repeat()
		)

		const pollSubscription = poll$.subscribe()

		return (): void => {
			pollSubscription.unsubscribe()
		}
	})
}
