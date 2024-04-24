export {}

/**
 * @typedef {import("../codegen/index.js").TypeSchema} InternalTypeDetails
 * @typedef {import("../codegen/index.js").TypeCheckedModule} TypeCheckedModule
 * @typedef {import("../codegen/index.js").TypeCheckedValidator} TypeCheckedValidator
 */

/**
 * @typedef {{
 *   allValidatorHashTypes: {[name: string]: any}
 *   hashDependencies: {[name: string]: string}
 *   dependsOnOwnHash?: boolean
 *   ownHash?: string
 *   parameters?: Record<string, any>
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
 *   getScriptHashType: (purpose: string) => any
 *   typeCheck: (validators: string[], modules: string[]) => ({
 *     modules: {[name: string]: TypeCheckedModule},
 *     validators: {[name: string]: TypeCheckedValidator}
 *   })
 *   compile: (main: string, modules: string[], options: CompileOptions) => CompileOutput
 * }} CompilerLib
 */
