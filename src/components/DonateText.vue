<template>
	<div>
		<p>
			У вас есть предложения по улучшению данной программы или вы хотите пообщаться с разработчиком?
			Напишите EVEMail письмо автору на персонажа <code>WhoIntel</code>.
		</p>
		<p class="font-italic">
			Если вы пользуетесь данной программой - рассмотрите возможность доната разработчику.
			<br>
			Это позволит уделить больше времени разработке, а не крабству в игре.
			<br>
			ISK - персонаж <a @click.prevent.stop="openExternalAuthor" href="https://evewho.com/character/2117227203">WhoIntel</a>
			<br>
			IRL - <a @click.prevent.stop="openExternalBoosty" href="https://boosty.to/whointel">поддержать</a>
		</p>
	</div>
</template>

<script lang="ts">
import {Component, Vue} from "vue-property-decorator"
import {shell} from "electron"

@Component
export default class DonateText extends Vue {
	openExternalAuthor() {
		shell.openExternal("https://evewho.com/character/2117227203")
	}

	openExternalBoosty() {
		shell.openExternal("https://boosty.to/whointel")
	}
}
</script>
