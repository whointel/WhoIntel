import YAML from "yaml"
import fs from "fs"
import readline from "readline"
import * as path from "path"

async function readRegions(invUniqueNamesPath: string) {
	let fileStream = fs.createReadStream(invUniqueNamesPath, "utf8")

	let lineReader = readline.createInterface({
		input: fileStream,
	})

	const regionNames = {}

	let nLine = -1
	let curId = 0

	// regular regions groupID == 3
	for await (const line of lineReader) {
		if (
			line !== "-   groupID: 3"
			&& nLine === -1
		) {
			continue
		}

		if (nLine === -1) {
			nLine = 0
			continue
		}

		if (nLine === 0) {
			nLine = 1
			curId = Number(line.substr(12, 8))
			continue
		}

		nLine = -1
		regionNames[curId] = line.substr(14, line.length - 14)
	}

	// by 26.10.2020 there is no Pochven region in SDE
	regionNames[10000070] = "Pochven"

	fileStream = fs.createReadStream(invUniqueNamesPath, "utf8")

	// regular systems groupID == 5
	lineReader = readline.createInterface({
		input: fileStream,
	})
	const systemNames = {}
	nLine = -1
	curId = 0
	for await (const line of lineReader) {
		if (
			line !== "-   groupID: 5"
			&& nLine === -1
		) {
			continue
		}

		if (nLine === -1) {
			nLine = 0
			continue
		}

		if (nLine === 0) {
			nLine = 1
			curId = Number(line.substr(12, 8))
			continue
		}

		nLine = -1
		systemNames[curId] = line.substr(14, line.length - 14)
	}

	return {regionNames, systemNames}
}

async function loopRegions(regionsPath: string, regionNames: any, systemNames: any) {
	const SystemDB: any[] = []
	const StarGateDB: any = {}
	const RegionDB: any = {}

	const regions = await fs.promises.readdir(regionsPath)

	for (const region of regions) {
		const regionFolder = path.join(regionsPath, region)
		const regionFolderStat = await fs.promises.stat(regionFolder)
		if (!regionFolderStat.isDirectory()) throw new Error(`"${regionFolder}" is not a directory`)

		const regionStaticDataPath = path.join(regionFolder, "region.staticdata")
		const regionStaticData = fs.readFileSync(regionStaticDataPath).toString()
		const matchResult = regionStaticData.match(/regionID: (?<regionID>\d+)/)

		if (!matchResult) continue
		// @ts-ignore
		const regionID = Number(matchResult.groups.regionID)
		if (!regionID) continue
		const regionName = regionNames[regionID]
		if (!regionName) continue

		console.log(`region ${regionName}:`)

		const constellations = await fs.promises.readdir(regionFolder)
		for (const constellation of constellations) {
			const constellationFolder = path.join(regionFolder, constellation)
			const stat = await fs.promises.stat(constellationFolder)
			if (!stat.isDirectory()) continue
			console.log(`\tconstellation ${constellation}:`)

			const systems = await fs.promises.readdir(constellationFolder)
			for (const system of systems) {
				const systemFolder = path.join(constellationFolder, system)
				const stat = await fs.promises.stat(systemFolder)
				if (!stat.isDirectory()) continue
				console.log(`\t\tsystem ${system}:`)

				const systemDataFile = path.join(systemFolder, "solarsystem.staticdata")
				const systemData = fs.readFileSync(systemDataFile).toString()
				const systemYaml = YAML.parse(systemData)
				const systemID = systemYaml.solarSystemID
				console.log(`\t\t\t ${systemNames[systemID]}:`)

				const stargates: any[] = []
				for (const [sgID, sg] of Object.entries(systemYaml.stargates)) {
					stargates.push(sgID)
					StarGateDB[sgID] = {
						systemId: systemID,
						// @ts-ignore
						destinationSG: sg.destination,
					}
				}

				RegionDB[regionID] = regionName

				SystemDB.push({
					id: systemID,
					name: systemNames[systemID] || system,
					regionId: regionID,
					// regionName: regionName,
					constellationName: constellation,
					stargates: stargates,
					security: systemYaml.security,
				})
			}
		}
	}
	return {SystemDB, StarGateDB, RegionDB}
}

async function readShipNames(typesIdsPath: string) {
	const fileStream = fs.createReadStream(typesIdsPath, "utf8")

	const lineReader = readline.createInterface({
		input: fileStream,
	})

	const ids: string[] = []
	let typeId = 0
	let groupId = 0
	let name = ""

	for await (const line of lineReader) {
		if (!line.startsWith(" ")) {
			typeId = Number(line)
			continue
		}

		if (line.startsWith("        en: ")) {
			name = line.substr("        en: ".length)
			continue
		}

		if (line === "    published: false") {
			groupId = 0
			continue
		}

		// NOTE not all ships published (ex capsule) but it's fine for now
		if (line === "    published: true") {
			if (
				(groupId >= 25 && groupId <= 31)
				|| groupId === 419
				|| groupId === 420
				|| groupId === 358
				|| (groupId >= 816 && groupId <= 834)
			) {
				ids.push(name)
			}
			groupId = 0
			continue
		}

		if (line.startsWith("    groupID: ")) {
			groupId = Number(line.substr("    groupID: ".length))
			continue
		}
	}

	return ids
}

export const SDEParser = async (/*base_path: string*/) => {
	const base_path = "d:\\Projects\\EVE\\sde\\"
	const invUniqueNamesPath = path.join(base_path, "bsd", "invUniqueNames.yaml")
	const {regionNames, systemNames} = await readRegions(invUniqueNamesPath)

	const regionsPath = path.join(base_path, "fsd", "universe", "eve")
	// // @ts-ignore
	const {SystemDB, StarGateDB, RegionDB} = await loopRegions(regionsPath, regionNames, systemNames)

	const SystemDBPath = path.join(base_path, "SystemDB.json")
	fs.writeFileSync(SystemDBPath, JSON.stringify(SystemDB))

	const StarGateDBPath = path.join(base_path, "StarGateDB.json")
	fs.writeFileSync(StarGateDBPath, JSON.stringify(StarGateDB))

	const RegionDBPath = path.join(base_path, "RegionDB.json")
	fs.writeFileSync(RegionDBPath, JSON.stringify(RegionDB))

	const shipNames = await readShipNames(path.join(base_path, "fsd", "typeIDs.yaml"))

	const ShipsDBPath = path.join(base_path, "ShipsDB.json")
	fs.writeFileSync(ShipsDBPath, JSON.stringify(shipNames))
}
