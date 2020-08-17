import Vue from "vue"
import Vuex from "vuex"
import {ZKB_STATUS} from "@/types/ZKillboard"
import {OVERLAY_TYPE} from "@/types/MAP"

Vue.use(Vuex)

const store = new Vuex.Store({
	state: {
		isLoaded: false,
		isJBShow: false,
		isAuth: false,
		EVEStatus: null,
		logs: [],
		ZKBStatus: ZKB_STATUS.DISCONNECTED,
		isRegionLoading: true,
		overlay: OVERLAY_TYPE.ALERT,
		error: "",
		showFleet: false,
		showLogsPanel: true,
		showTopPanel: true,
	},

	getters: {
		logs: state => state.logs,
		isLoaded: state => state.isLoaded,
		isJBShow: state => state.isJBShow,
		isAuth: state => state.isAuth,
		EVEStatus: state => state.EVEStatus,
		ZKBStatus: state => state.ZKBStatus,
		isRegionLoading: state => state.isRegionLoading,
		overlay: state => state.overlay,
		error: state => state.error,
		showFleet: state => state.showFleet,
		showLogsPanel: state => state.showLogsPanel,
		showTopPanel: state => state.showTopPanel,
	},

	mutations: {
		isLoaded: (state, loaded) => {
			state.isLoaded = loaded
		},
		addLog: (state, entry) => {
			// @ts-ignore
			state.logs.unshift(entry)
		},
		setJBShow: (state, show) => {
			state.isJBShow = show
		},
		setEVEStatus: (state, status) => {
			state.EVEStatus = status
		},
		setZKBStatus: (state, status: ZKB_STATUS) => {
			state.ZKBStatus = status
		},
		setRegionLoading: (state, loading) => {
			state.isRegionLoading = loading
		},
		setOverlay: (state, overlay) => {
			state.overlay = overlay
		},
		setError: (state, error) => {
			state.error = error
		},
		setFleetShow: (state, showFleet) => {
			state.showFleet = showFleet
		},
		setShowLogsPanel: (state, showLogsPanel) => {
			state.showLogsPanel = showLogsPanel
		},
		setShowTopPanel: (state, showTopPanel) => {
			state.showTopPanel = showTopPanel
		},
	},

	actions: {
		setJBShow({commit}, show) {
			commit("setJBShow", show)
		},
	},

	modules: {}
})

export default store
