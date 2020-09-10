<template>
	<v-list-item :style="`background-color: rgba(${bgColor})`">
		<v-list-item-icon>
			<v-icon>{{ icon }}</v-icon>
		</v-list-item-icon>
		<v-list-item-content>
			<v-list-item-subtitle v-if="isZKillboard">{{ time }} - {{ regionNames }} - {{ entry.channel }}</v-list-item-subtitle>
			<v-list-item-subtitle v-else>{{ time }} - {{ regionNames }} - {{ entry.sender }} - {{ entry.channel }}</v-list-item-subtitle>
			<v-list-item-title class="log-message-text" v-html="message"/>
		</v-list-item-content>
	</v-list-item>
</template>

<script lang="ts">
import {Component, Prop, Vue} from "vue-property-decorator"
// eslint-disable-next-line no-unused-vars
import {ILogEntry, LOG_ENTRY_TYPE} from "@/types/ILogEntry"
import format from "date-fns/format"
import Autolinker from "autolinker"
import systemManager from "@/service/SystemManager"
import characterResolveService from "@/service/CharacterResolveService"
import settingsService from "@/service/settings"

@Component
export default class LogEntry extends Vue {
	@Prop(Object)
	entry!: ILogEntry

	get time(): string {
		return format(this.entry.ts, "HH:mm:ss")
	}

	get isZKillboard() {
		return this.entry.type === LOG_ENTRY_TYPE.ZKILLBOARD
	}

	get bgColor(): string {
		return this.entry.zk?.old
			? (settingsService.$.darkTheme ? "236,236,236,0.2" : "236,236,236")
			: "0,0,0,0"
	}

	get icon(): string {
		switch (this.entry.type) {
			case LOG_ENTRY_TYPE.LOCAL:
				return "mdi-map-marker-path"
			case LOG_ENTRY_TYPE.ZKILLBOARD:
				return this.entry.zk?.npcOnly ? "mdi-emoticon-poop" : "mdi-skull"
			case LOG_ENTRY_TYPE.SECURE:
				if (this.entry.secure!.question) return "mdi-help"
				if (this.entry.secure!.clear) return "mdi-weather-sunny"
				if (this.entry.secure!.boost) return "mdi-run-fast"
				return "mdi-circle-small"
			default:
				return "mdi-account"
		}
	}

	get regionNames() {
		return this.entry.systems.map(system => system.region.name).join(" ")
	}

	messageParts: string[] = []

	get message(): string {
		return this.messageParts.join("&nbsp;")
	}

	created() {
		let msg = this.entry.message

		msg = Autolinker.link(msg, {
			newWindow: true,
			urls: {
				schemeMatches: true,
				wwwMatches: false,
				tldMatches: false,
			},
			email: false,
			phone: false,
			mention: false,
			hashtag: false,
			stripPrefix: false,
			stripTrailingSlash: false,
			decodePercentEncoding: false,
			sanitizeHtml: true,
			replaceFn: function (match) {
				const tag = match.buildTag()
				tag.setAttr("rel", "nofollow noreferrer")
				tag.setAttr("data-link", match.getAnchorHref())
				tag.addClass("external-link")

				return tag
			}
		})

		switch (this.entry.type) {
			case LOG_ENTRY_TYPE.LOCAL:
				this.messageParts[0] = this.formatSystem(msg)
				break
			case LOG_ENTRY_TYPE.ZKILLBOARD:
				this.parseMessageZKB()
				break
			case LOG_ENTRY_TYPE.SECURE:
				this.messageParts = msg.split("  ")
				this.parseMessage()
				break
			default:
				this.messageParts[0] = this.formatSystem(msg)
				break
		}
	}

	async parseMessageZKB() {
		this.messageParts[0] = `<a href="#" class="system_mark_pointer" data-id="${this.entry.systems[0].id}">${this.entry.systems[0].name}</a>`
		this.messageParts[1] = `<a href="${this.entry.zk!.url}" data-link="${this.entry.zk!.url}" class="external-link">${this.entry.zk!.url}</a>`

		const character = await characterResolveService.findById(this.entry.zk!.character_id)

		if (character.exists) {
			this.$set(this.messageParts, 1,
				`<a href="${this.entry.zk!.url}" data-link="${this.entry.zk!.url}" class="external-link">${character.name}</a>`
			)
		}
	}

	formatSystem(str: string) {
		this.entry.systems.forEach(system => {
			const tag = `$1<a href="#" class="system_mark_pointer" data-id="${system.id}">${system.name}$2</a>`
			str = str.replace(new RegExp(`^()${system.name}(\\*)?`, "ig"), tag)
			str = str.replace(new RegExp(`( )${system.name}(\\*)?`, "ig"), tag)
		})

		return str
	}

	async parseMessage() {
		let partWOStar: string
		for (let i = 0; i < this.messageParts.length; i++) {
			let part = this.messageParts[i]
			partWOStar = part
			if (part.endsWith("*")) {
				partWOStar = part.substr(0, part.length - 1)
			}

			if (systemManager.ShipsDB.includes(partWOStar.toLowerCase())) {
				this.$set(this.messageParts, i, `<i>${part}</i>`)
				continue
			}

			const partSystem = this.formatSystem(part)

			if (partSystem !== part) {
				this.$set(this.messageParts, i, partSystem)
				continue
			}

			const isValidName = characterResolveService.isValidName(partWOStar)
			if (!isValidName) continue

			const character = await characterResolveService.findByName(partWOStar)

			if (character.exists) {
				this.$set(this.messageParts, i,
					`<a href="https://zkillboard.com/character/${character.id}/" data-link="https://zkillboard.com/character/${character.id}/" class="external-link">${part}</a>`
				)
			}
		}
	}
}
</script>

<style scoped>
.log-message-text {
	white-space: unset !important;
}
</style>
