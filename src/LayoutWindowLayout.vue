<template>
	<td>
		<v-text-field
			v-model="layout.title"
			label="Название"
			class="mt-3"
		/>

		<div v-if="advanced_mode">
			<v-row>
				<v-col cols="4">
					<v-switch dense v-model="layout.winMaximized" label="Развернутое окно"/>
				</v-col>
				<v-col>
					<v-row class="subtitle-1 ml-0">
						Положение карты
						<v-btn
							class="ml-2" outlined x-small
							@click="setCurrentScroll"
						>использовать текущие
						</v-btn>
					</v-row>
					<v-row class="align-center">
						<v-col cols="4">
							<v-text-field
								v-model="layout.scroll.top"
								label="Скролл сверху"
								type="number"
							/>
						</v-col>
						<v-col cols="4">
							<v-text-field
								v-model="layout.scroll.left"
								label="Скролл слева"
								type="number"
							/>
						</v-col>
						<v-col cols="4">
							<v-text-field
								v-model="layout.scroll.scale"
								label="Приближение %"
								type="number"
							/>
						</v-col>
					</v-row>
				</v-col>
			</v-row>

			<v-row>
				<v-col cols="6">
					<v-row class="subtitle-1 ml-0">
						Позиция окна на мониторе
						<v-btn
							class="ml-2" outlined x-small
							@click="setCurrentPosition"
						>использовать текущие
						</v-btn>
					</v-row>
					<v-row class="align-center">
						<v-col cols="6">
							<v-text-field
								v-model="layout.winPosition[0]"
								label="Position X"
								type="number"
							/>
						</v-col>
						<v-col cols="6">
							<v-text-field
								v-model="layout.winPosition[1]"
								label="Position Y"
								type="number"
							/>
						</v-col>
					</v-row>
				</v-col>
				<v-col cols="6">
					<v-row class="subtitle-1 ml-0">
						Размеры окна
						<v-btn
							class="ml-2" outlined x-small
							@click="setCurrentSize"
							:disabled="layout.winMaximized"
						>использовать текущие
						</v-btn>
					</v-row>
					<v-row class="align-center">
						<v-col cols="6">
							<v-text-field
								v-model="layout.winSize[0]"
								label="Width"
								type="number"
								:disabled="layout.winMaximized"
							/>
						</v-col>
						<v-col cols="6">
							<v-text-field
								v-model="layout.winSize[1]"
								label="Height"
								type="number"
								:disabled="layout.winMaximized"
							/>
						</v-col>
					</v-row>
				</v-col>
			</v-row>

			<v-slider
				dense
				append-icon="mdi-plus"
				prepend-icon="mdi-minus"
				:min="10"
				:max="100"
				:step="1"
				:label="'Непрозрачность (' + layout.winOpacity + '%)'"
				v-model="layout.winOpacity"
			/>

			<v-row>
				<v-col cols="6">
					<v-switch dense v-model="layout.hideLogPanel" label="Спрятать панель лога"/>
					<v-switch dense v-model="layout.hideTopPanel" label="Спрятать верхнюю панель"/>
				</v-col>
				<v-col cols="6">
					<v-switch dense v-model="layout.winAlwaysOnTop" label="Поверх других окон"/>
					<!--label="Ignore mouse (click through)"-->
					<v-switch dense v-model="layout.winIgnoreMouseEvents"
										label="Игнорировать мышь (клики попадают в окно под программой)"/>
					<v-switch dense v-model="layout.winSkipTaskbar" label="Спрятать программу из панели задач"/>
				</v-col>
			</v-row>
		</div>

		<div v-if="!advanced_mode">
			<v-row>
				<v-col cols="4">
					<v-checkbox
						v-model="bgModeValue"
						:indeterminate="bgModeIndeterminate"
						label="Background режим"
						:error-messages="bgModeIndeterminate ? 'Настройки изменены в расширенном режиме' : null"
					>
						<template v-slot:prepend>
							<v-tooltip bottom transition="fade-transition">
								<template v-slot:activator="{ on, attrs }">
									<v-icon
										v-bind="attrs"
										v-on="on"
									>
										mdi-help-circle-outline
									</v-icon>
								</template>
								<span>В этом режиме:<br>
							- панель кнопок и панель лога прячется<br>
							- окно становится полупрозрачным<br>
							- окно уменьшается<br>
							- окно перемещается в левый верхний угол<br>
							- окно перестает взаимодействовать с мышью<br>
							- окно всегда видно<br>
							- программы прячется из панели программ
							</span>
							</v-tooltip>
						</template>
					</v-checkbox>
				</v-col>
				<v-col>
					<v-row class="subtitle-1 ml-0">
						Положение карты
						<v-btn
							class="ml-2" outlined x-small
							@click="setCurrentScroll"
						>использовать текущие
						</v-btn>
					</v-row>
					<v-row class="align-center">
						<v-col cols="4">
							<v-text-field
								v-model="layout.scroll.top"
								label="Скролл сверху"
								type="number"
							/>
						</v-col>
						<v-col cols="4">
							<v-text-field
								v-model="layout.scroll.left"
								label="Скролл слева"
								type="number"
							/>
						</v-col>
						<v-col cols="4">
							<v-text-field
								v-model="layout.scroll.scale"
								label="Приближение %"
								type="number"
							/>
						</v-col>
					</v-row>
				</v-col>
			</v-row>

			<div v-if="!bgModeValue">
				<v-btn small outlined @click="setCurrentPositionSize">
					использовать текущие положение и размер окна
				</v-btn>
				<br>
				<br>
				<p>
					на весь экран: {{ layout.winMaximized ? "да" : "нет" }}
					<span v-if="!layout.winMaximized">
						<br>
						расположение окна: {{ layout.winPosition[0] }}:{{ layout.winPosition[1] }}
						<br>
						размер окна: {{ layout.winSize[0] }}x{{ layout.winSize[1] }}
					</span>
				</p>
			</div>
		</div>
	</td>
</template>

<script lang="ts">
import {Component, Prop, Vue} from "vue-property-decorator"
import {ipcRenderer} from "electron"
import {IWindowLayout} from "@/types/WidnowLayout"
import events from "@/service/EventBus"

@Component
export default class LayoutWindowLayout extends Vue {
	@Prop({type: Boolean}) advanced_mode!: boolean
	@Prop({type: Object}) layout!: IWindowLayout

	get bgModeIndeterminate(): boolean {
		if (this.bgModeValue) return false

		if (this.layout.hideLogPanel) return true
		if (this.layout.winOpacity !== 100) return true
		if (this.layout.winSkipTaskbar) return true
		if (this.layout.winAlwaysOnTop) return true
		if (this.layout.winIgnoreMouseEvents) return true
		if (this.layout.hideTopPanel) return true
		// if (!this.layout.winMaximized) return true

		return false
	}

	get bgModeValue(): boolean {
		if (!this.layout.hideLogPanel) return false
		if (this.layout.winOpacity !== 30) return false
		if (!this.layout.winSkipTaskbar) return false
		if (this.layout.winMaximized) return false
		if (!this.layout.winAlwaysOnTop) return false
		if (!this.layout.winIgnoreMouseEvents) return false
		if (!this.layout.hideTopPanel) return false
		if (this.layout.winSize[0] !== 500 || this.layout.winSize[1] !== 500) return false
		if (this.layout.winPosition[0] !== 50 || this.layout.winPosition[1] !== 50) return false

		return true
	}

	set bgModeValue(value: boolean) {
		if (value) {
			Object.assign(this.layout, {
				hideLogPanel: true,
				winOpacity: 30,
				winSkipTaskbar: true,
				winMaximized: false,
				winAlwaysOnTop: true,
				winIgnoreMouseEvents: true,
				hideTopPanel: true,
				winSize: [500, 500],
				winPosition: [50, 50],
			})
		} else {
			Object.assign(this.layout, {
				hideLogPanel: false,
				winOpacity: 100,
				winSkipTaskbar: false,
				winMaximized: true,
				winAlwaysOnTop: false,
				winIgnoreMouseEvents: false,
				hideTopPanel: false,
				winSize: [500, 500],
				winPosition: [50, 50],
			})
		}
	}

	async setCurrentPosition() {
		const result = await ipcRenderer.invoke("window:get:positionsize")
		this.$set(this.layout, "winPosition", result.position)
	}

	async setCurrentSize() {
		const result = await ipcRenderer.invoke("window:get:positionsize")
		this.$set(this.layout, "winSize", result.size)
	}

	async setCurrentPositionSize() {
		const result = await ipcRenderer.invoke("window:get:positionsize")
		this.$set(this.layout, "winPosition", result.position)
		this.$set(this.layout, "winSize", result.size)
		this.$set(this.layout, "winMaximized", result.isMaximized)
	}

	setCurrentScroll() {
		events.sendToMain("window:layouts:get:mapscroll", this.layout.uuid)
	}

	created() {
		events.$on("electron:window:layouts:set:mapscroll", this.setMapScroll.bind(this))
	}

	beforeDestroy() {
		events.$off("electron:window:layouts:set:mapscroll", this.setMapScroll.bind(this))
	}

	setMapScroll(event, scroll: any) {
		if (!scroll || scroll.uuid !== this.layout.uuid) return

		Object.assign(this.layout, {
			scroll: {
				left: scroll.left,
				top: scroll.top,
				scale: scroll.scale,
			}
		})
	}
}
</script>
