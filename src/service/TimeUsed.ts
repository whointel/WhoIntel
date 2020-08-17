import events from "@/service/EventBus"

const ONE_HOUR_IN_MS = 3_600_000

class TimeUsedService {
	init() {
		setInterval(this.hourPast.bind(this), ONE_HOUR_IN_MS)
	}

	hourPast() {
		let hours = this.getHours()
		hours++
		localStorage.setItem("TimeUsedHours", hours as any)
		if (hours === 50 || hours === 100 || hours === 200 || hours === 1000) {
			events.$emit("showLikeDisLike")
		}
	}

	getHours(): number {
		return Number(localStorage.getItem("TimeUsedHours") || 0)
	}
}

const timeUsedService = new TimeUsedService()

export default timeUsedService
