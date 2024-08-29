import { readHeader } from "@helios-lang/compiler-utils"

export {}

/**
 * @typedef {import("@helios-lang/uplc").PlutusVersion} PlutusVersion
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("../codegen/index.js").TypeSchema} InternalTypeDetails
 * @typedef {import("../codegen/index.js").TypeCheckedModule} TypeCheckedModule
 * @typedef {import("../codegen/index.js").TypeCheckedValidator} TypeCheckedValidator
 */

/**
 * @typedef {any} ScriptHashType
 */

/**
 * @typedef {{
 *   allValidatorHashTypes: Record<string, ScriptHashType>
 *   allValidatorIndices?: Record<string, number>
 *   hashDependencies: Record<string, string>
 *   dependsOnOwnHash?: boolean
 *   ownHash?: string
 *   parameters?: Record<string, UplcData>
 *   isTestnet: boolean
 *   optimize: boolean
 *   excludeUserFuncs?: Set<string>
 *   onCompileUserFunc?: (name: string, cborHex: string, altCborHex: Option<string>, plutusVersion: PlutusVersion) => void
 * }} CompileOptions
 */

/**
 * @typedef {{
 *   cborHex: string
 *   plutusVersion: PlutusVersion
 * }} CompileOutput
 */

/**
 * @typedef {{
 *   modules: {[name: string]: TypeCheckedModule}
 *   validators: {[name: string]: TypeCheckedValidator}
 * }} TypeCheckOutput
 */

/**
 * @typedef {{
 *   name: string
 *   purpose: string
 *   sourceCode: string
 * }} SourceDetails
 */

/**
 * @typedef {{
 *   version: string
 *   getScriptHashType: (purpose: string) => ScriptHashType
 *   typeCheck: (validators: string[], modules: string[]) => ({
 *     modules: {[name: string]: TypeCheckedModule},
 *     validators: {[name: string]: TypeCheckedValidator}
 *   })
 *   compile: (main: string, modules: string[], options: CompileOptions) => CompileOutput
 * }} CompilerLib
 */

/**
 * @typedef {Record<string, string[]>} DagDependencies
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
