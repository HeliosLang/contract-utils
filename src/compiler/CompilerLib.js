export {}

/**
 * @typedef {import("../codegen/index.js").TypeSchema} InternalTypeDetails
 * @typedef {import("../codegen/index.js").TypeCheckedModule} TypeCheckedModule
 * @typedef {import("../codegen/index.js").TypeCheckedValidator} TypeCheckedValidator
 */

/**
 * @typedef {{
 *   allValidatorHashTypes: {[name: string]: any},
 *   hashDependencies: {[name: string]: string},
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
 *   name: string
 *   purpose: string
 *   sourceCode: string
 * }} SourceDetails
 */

/**
 * @typedef {{
 *   version: string
 *   getScriptHashType: (purpose: string) => any
 *   typeCheck: (validators: {[name: string]: SourceDetails}, modules: {[name: string]: SourceDetails}) => ({
 *     modules: {[name: string]: TypeCheckedModule},
 *     validators: {[name: string]: TypeCheckedValidator}
 *   })
 *   compile: (main: string, modules: string[], options: CompileOptions) => CompileOutput
 * }} CompilerLib
 */
