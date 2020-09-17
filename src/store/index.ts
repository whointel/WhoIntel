import Vue from "vue"
import Vuex from "vuex"
import {ZKB_STATUS} from "@/types/ZKillboard"
import {OVERLAY_TYPE} from "@/types/MAP"

Vue.use(Vuex)

const store = new Vuex.Store({
	state: {
		isAppReady: false,
		isLoading: true,
		isJBShow: false,
		isAuth: false,
		EVEStatus: null,
		ZKBStatus: ZKB_STATUS.DISCONNECTED,
		overlay: OVERLAY_TYPE.ALERT,
		error: "",
		showFleetPanel: false,
		showLogsPanel: true,
		showTopPanel: true,
		showPathPanel: false,
	},

	getters: {
		isAppReady: state => state.isAppReady,
		isLoading: state => state.isLoading,
		isJBShow: state => state.isJBShow,
		isAuth: state => state.isAuth,
		EVEStatus: state => state.EVEStatus,
		ZKBStatus: state => state.ZKBStatus,
		overlay: state => state.overlay,
		error: state => state.error,
		showFleetPanel: state => state.showFleetPanel,
		showLogsPanel: state => state.showLogsPanel,
		showTopPanel: state => state.showTopPanel,
		showPathPanel: state => state.showPathPanel,
	},

	mutations: {
		setAppReady: (state) => {
			state.isAppReady = true
		},
		setLoading: (state, loading) => {
			state.isLoading = loading
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
		setOverlay: (state, overlay) => {
			state.overlay = overlay
		},
		setError: (state, error) => {
			state.error = error
		},
		setShowFleetPanel: (state, showFleetPanel) => {
			state.showFleetPanel = showFleetPanel
		},
		setShowLogsPanel: (state, showLogsPanel) => {
			state.showLogsPanel = showLogsPanel
		},
		setShowTopPanel: (state, showTopPanel) => {
			state.showTopPanel = showTopPanel
		},
		setShowPathPanel: (state, showPathPanel) => {
			state.showPathPanel = showPathPanel
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
