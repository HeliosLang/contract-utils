export {}

/**
 * @typedef {import("./TypeSchema.js").TypeSchema} TypeSchema
 */

/**
 * `returns` is optional to accomodate main functions that return undefined
 * @typedef {{
 *   name: string
 *   requiresScriptContext: boolean
 *   requiresCurrentScript: boolean
 *   arguments: {
 *     name: string
 *     type: TypeSchema
 *     isOptional: boolean
 *     isIgnored?: boolean
 *   }[]
 *   returns?: TypeSchema
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
