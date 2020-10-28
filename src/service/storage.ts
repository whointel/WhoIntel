class StorageService {
	setObject(key: string, value: object) {
		this.setItem(key, JSON.stringify(value))
	}

	getObject(key: string) {
		const value = this.getItem(key)
		if (value === null) {
			return
		}
		try {
			return JSON.parse(value)
		} catch (e) {
			return undefined
		}
	}

	setItem(key: string, value: string) {
		localStorage.setItem(key, value)
	}

	getItem(key: string) {
		return localStorage.getItem(key)
	}

	removeItem(key: string) {
		localStorage.removeItem(key)
	}

	clear() {
		localStorage.clear()
	}
}

const storageService = new StorageService()

export default storageService
