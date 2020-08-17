import * as path from "path"
declare const __static: string

export function getAsses(asset: string) {
	return path.join(__static, asset)
}
