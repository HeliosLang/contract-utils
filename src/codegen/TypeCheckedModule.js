export {}

/**
 * @typedef {import("./TypeSchema.js").TypeSchema} TypeSchema
 */

/**
 * @typedef {{
 *   requiresScriptContext: boolean
 *   requiresCurrentScript: boolean
 *   arguments: {
 *     name: string
 *     type: TypeSchema
 *   }[]
 *   returns: TypeSchema
 * }} TypeCheckedUserFunc
 */

/**
 * @typedef {{
 *   name: string
 *   purpose: string
 *   sourceCode: string
 *   moduleDepedencies: string[]
 *   types: Record<string, TypeSchema>
 *   functions?: Record<string, TypeCheckedUserFunc>
 * }} TypeCheckedModule
 */
