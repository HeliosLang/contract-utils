export * from "./cast/index.js"
export {
    ContractContextBuilder,
    contractContextCache
} from "./context/index.js"
export { typeCheckFiles, typeCheckScripts } from "./compiler/ops.js"
export { LoadedScriptsWriter } from "./codegen/LoadedScriptsWriter.js"
export { loadCompilerLib } from "./compiler/ops.js"

/**
 * @typedef {import("./codegen/index.js").LoadedValidator} LoadedValidator
 * @typedef {import("./codegen/index.js").LoadedModule} LoadedModule
 */

/**
 * @template {{[name: string]: import("./codegen/index.js").LoadedValidator}} Vs
 * @template {{[name: string]: import("./codegen/index.js").LoadedModule}} Ms
 * @typedef {import("./context/index.js").ContractContext<Vs, Ms>} ContractContext
 */

/**
 * @template {LoadedValidator} V
 * @typedef {import("./codegen/index.js").ExtractDependencies<V>} ExtractDependencies
 */
