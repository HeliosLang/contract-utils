export { LoadedScriptsWriter } from "./LoadedScriptsWriter.js"

/**
 * @typedef {import("./LoadedModule.js").LoadedModule} LoadedModule
 * @typedef {import("./LoadedValidator.js").LoadedValidator} LoadedValidator
 * @typedef {import("./TypeCheckedModule.js").TypeCheckedModule} TypeCheckedModule
 * @typedef {import("./TypeCheckedValidator.js").TypeCheckedValidator} TypeCheckedValidator
 * @typedef {import("./TypeSchema.js").TypeSchema} TypeSchema
 */

/**
 * @template {LoadedValidator} V
 * @typedef {import("./LoadedValidator.js").ExtractDependencies<V>} ExtractDependencies
 */
