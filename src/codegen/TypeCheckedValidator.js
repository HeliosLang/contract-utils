export {}

/**
 * @typedef {import("./TypeCheckedModule.js").TypeCheckedModule} TypeCheckedModule
 * @typedef {import("./TypeSchema.js").TypeSchema} TypeSchema
 */

/**
 * @typedef {TypeCheckedModule & {
 *   hashDependencies: string[]
 *   currentScriptIndex?: number
 *   Redeemer: TypeSchema
 *   Datum?: TypeSchema
 * }} TypeCheckedValidator
 */
