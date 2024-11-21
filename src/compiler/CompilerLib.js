import { readHeader } from "@helios-lang/compiler-utils"

/**
 * @import { CompilerLib, ScriptHashType } from "../index.js"
 */

/**
 * @param {CompilerLib} lib
 * @param {string[]} validators
 * @returns {{[name: string]: ScriptHashType}}
 */
export function getValidatorTypes(lib, validators) {
    return Object.fromEntries(
        validators.map((src) => {
            const [purpose, name] = readHeader(src)
            return [name, lib.getScriptHashType(purpose)]
        })
    )
}
