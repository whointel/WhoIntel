import "@mdi/font/css/materialdesignicons.css"
import Vue from "vue"
import Vuetify from "vuetify/lib"
import ru from "vuetify/src/locale/ru"
import en from "vuetify/src/locale/en"

Vue.use(Vuetify)

export default new Vuetify({
	lang: {
		locales: {ru, en},
		current: "en",
	},
	icons: {
		iconfont: "mdi",
	},
});
