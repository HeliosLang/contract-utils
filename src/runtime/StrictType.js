import { Cast } from "./Cast.js"

/**
 * @template {Cast} C
 * @typedef {C extends Cast<infer TStrict, any> ? TStrict : never} StrictType
 */
