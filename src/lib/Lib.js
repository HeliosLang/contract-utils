/**
 * @typedef {{
 *   version: string
 *   typeCheck: (validators: {[name: string]: SourceDetails}, modules: {[name: string]: SourceDetails}) => ({
 * modules: {[name: string]: ModuleDetails}, validators: {[name: string]: ValidatorDetails}})
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
