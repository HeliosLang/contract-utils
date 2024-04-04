import * as lib from "@helios-lang/compiler"
import { CompilerLib_v0_16 } from "./CompilerLib_v0_16.js"

/**
 * @typedef {import("./CompilerLib.js").CompilerLib} CompilerLib
 */

/**
 * @param {{VERSION: string}} lib
 * @returns {number[]}
 */
function getVersion(lib) {
    return lib.VERSION.split(".").map((v) => Number(v))
}

/**
 * @returns {CompilerLib}
 */
export function loadCompilerLib() {
    const [major, minor] = getVersion(lib)

    switch (major) {
        case 0:
            switch (minor) {
                case 16:
                    return new CompilerLib_v0_16(lib)
            }
        default:
            throw new Error(`compiler version ${lib.VERSION} not supported`)
    }
}
