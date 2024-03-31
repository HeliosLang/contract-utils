/**
 * @typedef {import("./TypeSchema.js").TypeSchema} TypeSchema
 */

/**
 * @typedef {import("./Module.js").Module} Module
 */

/**
 * @typedef {Module & {
 *   hashDependencies: string[]
 *   Redeemer: TypeSchema
 *   Datum?: TypeSchema
 * }} Validator
 */

export const _ = {}
