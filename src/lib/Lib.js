/**
 * @typedef {{
 *   allValidatorTypes: {[name: string]: any},
 *   otherValidators: {[name: string]: {purpose: string, hash: string}},
 *   dependsOnOwnHash?: boolean,
 *   ownHash?: string,
 *   optimize: boolean
 * }} CompileOptions
 */

/**
 * @typedef {{
 *   cborHex: string
 *   prettyIR: string
 * }} CompileOutput
 */

/**
 * @typedef {{
 *   isMainnet?: boolean
 *   checkCasts?: boolean
 *   moduleOrder?: string[]
 * }} LibOptions
 */

/**
 * @typedef {{
 *   version: string
 *   getValidatorType: (purpose: string) => any
 *   typeCheck: (validators: {[name: string]: SourceDetails}, modules: {[name: string]: SourceDetails}) => ({
 * modules: {[name: string]: ModuleDetails}, validators: {[name: string]: ValidatorDetails}})
 *   compile: (main: string, modules: string[], options: CompileOptions) => CompileOutput
 * }} Lib
 */

/**
 * @typedef {import("../codegen/index.js").TypeSchema} InternalTypeDetails
 * @typedef {import("../codegen/index.js").Module} ModuleDetails
 * @typedef {import("../codegen/index.js").Validator} ValidatorDetails
 */

/**
 * @typedef {{
 *   name: string
 *   purpose: string
 *   sourceCode: string
 * }} SourceDetails
 */

/**
 * @param {{VERSION: string}} lib
 * @returns {number[]}
 */
export function getVersion(lib) {
    return lib.VERSION.split(".").map((v) => Number(v))
}
