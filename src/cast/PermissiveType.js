import { Cast } from "./Cast.js"

/**
 * @template {Cast} C
 * @typedef {C extends Cast<any, infer TPermissive> ? TPermissive : never} PermissiveType
 */
