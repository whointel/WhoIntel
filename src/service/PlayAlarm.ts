import settingsService from "@/service/settings"

function getMedia(): string {
	const media = settingsService.$.alarmMedia

	return (media && media.length) ? media : "default"
}

const player = new Audio("sound://" + btoa(getMedia()))

export const PlayAlarm = () => {
	player.pause()
	player.src = "sound://" + btoa(getMedia())
	player.volume = (settingsService.$.alarmVolume / 100)
	player.play()
}

export const StopAlarm = () => {
	player.pause()
}
