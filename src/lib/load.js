import { getVersion } from "./Lib.js"
import { Lib_v0_16 } from "./Libg_v0_16.js"

/**
 * @typedef {import("./Lib.js").Lib} Lib
 */

const packageNames = [
    "@hyperionbt/helios"
]

/**
 * @returns {Promise<Lib>}
 */
export async function loadLibrary() {
    for (let packageName of packageNames) {
        try {
            const lib = await eval(`import("${packageName}")`)
    
            const [major, minor] = getVersion(lib)
    
            switch(major) {
                case 0:
                    switch (minor) {
                        case 16:
                            return new Lib_v0_16(lib)
                    }
                default:
                    throw new Error(`compiler version ${lib.VERSION} not supported`)
            }
        } catch(_e) {
            continue
        }
    }
    
    throw new Error("compiler not installed")
}