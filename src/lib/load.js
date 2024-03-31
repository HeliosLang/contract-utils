import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { getVersion } from "./Lib.js"
import { Lib_v0_16 } from "./Libg_v0_16.js"

/**
 * @typedef {import("./Lib.js").Lib} Lib
 */

/**
 * @returns {string}
 */
function findRootDir() {
    let dir = process.cwd()

    while (dir != "/") {
        if (existsSync(join(dir, "package.json"))) {
            return dir
        } else {
            dir = dirname(dir)
        }
    }

    throw new Error("package.json not found")
}

/**
 * @returns {Promise<Lib>}
 */
export async function loadLibrary() {
    const rootDir = findRootDir()

    const packageNames = ["@hyperionbt/helios/helios.js"]

    for (let packageName of packageNames) {
        try {
            const lib = await eval(
                `import("${rootDir}/node_modules/${packageName}")`
            )

            const [major, minor] = getVersion(lib)

            switch (major) {
                case 0:
                    switch (minor) {
                        case 16:
                            return new Lib_v0_16(lib)
                    }
                default:
                    throw new Error(
                        `compiler version ${lib.VERSION} not supported`
                    )
            }
        } catch (_e) {
            console.error(_e)
            continue
        }
    }

    throw new Error("compiler not installed")
}
