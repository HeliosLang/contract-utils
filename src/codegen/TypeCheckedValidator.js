export {}

/**
 * @typedef {import("./TypeCheckedModule.js").TypeCheckedModule} TypeCheckedModule
 * @typedef {import("./TypeSchema.js").TypeSchema} TypeSchema
 */

/**
 * @typedef {TypeCheckedModule & {
 *   hashDependencies: string[]
 *   Redeemer: TypeSchema
 *   Datum?: TypeSchema
 * }} TypeCheckedValidator
 */
