import { Cast } from "./cast/index.js"
export { Cast }
export { ContractContextBuilder } from "./runtime/index.js"

/**
 * @template {Cast} C
 * @typedef {import("./cast/index.js").StrictType<C>} StrictType
 */

/**
 * @template {Cast} C
 * @typedef {import("./cast/index.js").PermissiveType<C>} PermissiveType
 */
