<template>
	<div>
		<v-chip
			x-small outlined label color="yellow"
			@click="test"
		>test
		</v-chip>
	</div>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import systemManager from "@/service/SystemManager";
import characterManager from "@/service/CharacterManager";
// import {LOG_ENTRY_TYPE} from "@/types/ILogEntry"
// import events from "@/service/EventBus"
// import {ipcRenderer} from "electron"
// import systemManager from "@/service/SystemManager"

@Component
export default class TestBtn extends Vue {

	test() {
		// const system = systemManager.getSystemByName("MOCW-2")
		// characterManager.setLocation("TEST", system!)
		// ipcRenderer.send("open:layouts")
		// events.$emit("showLikeDisLike")
		//
		// events.$emit("electron:logReader:entry", null, {
		// 	ts: new Date(),
		// 	sender: "TEST",
		// 	// message: "Channel MOTD: Секьюр канал только для регионов Insmother / Detorid и ближайших систем.Флуд запрещен.Формат подачи: -Система- -Ник- -Тип корабля- О группах врага можно сообщать через fleetcom.space/intel или км.Сервис adashboard запрещён к использованию!Вся координация пвп активности ведется либо в тс, либо во флит чатах.Операторы канала: Ginbread Solarsystems  Zapp Brenigen  Nogik  Konstantin Surovij I Sam __________________________________________________Intel Channel only for regions Insmother / Detorid and nearby systems.Flood is forbidden.Format of intel: -System- -Nickname- -Ship type- Enemy groups can be reported through the fleetcom.space/intel  or KM.The adashboard service is not allowed to be used!All coordination of pvp activity is conducted either in TeamSpeak or in fleet chats.Channel operator: Ginbread  Solarsystems  Zapp Brenigen  Nogik  Konstantin Surovij",
		// 	message: "Zapp Brenigen",
		// 	// message: "Johnny O'Reilly  WhoIntel  Jita",
		// 	channel: "TEST",
		// 	systems: [],
		// 	hash: String(Math.random()),
		// 	type: LOG_ENTRY_TYPE.SECURE,
		// })
	}
}
</script>
