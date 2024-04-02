import * as lib from "@helios-lang/compiler"
import { getVersion } from "./Lib.js"
import { Lib_v0_16 } from "./Libg_v0_16.js"

/**
 * @typedef {import("./Lib.js").Lib} Lib
 */

/**
 * @returns {Lib}
 */
export function loadLibrary() {
    const [major, minor] = getVersion(lib)

    switch (major) {
        case 0:
            switch (minor) {
                case 16:
                    return new Lib_v0_16(lib)
            }
        default:
            throw new Error(`compiler version ${lib.VERSION} not supported`)
    }
}
