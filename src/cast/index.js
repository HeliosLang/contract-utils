import { Cast } from "./Cast.js"
export { Cast }
export { configureCast } from "./Cast.js"
export { UserFunc } from "./UserFunc.js"

/**
 * @typedef {import("./Cast.js").CastConfig} CastConfig
 */

/**
 * @template TStrict
 * @template TPermissive
 * @typedef {import("./Cast.js").ConfigurableCast<TStrict, TPermissive>} ConfigurableCast
 */

/**
 * @template TStrict
 * @template TPermissive
 * @typedef {import("./Cast.js").CastLike<TStrict, TPermissive>} CastLike
 */

/**
 * @template {CastLike<any, any>} C
 * @typedef {import("./PermissiveType.js").PermissiveType<C>} PermissiveType
 */

/**
 * @template {CastLike<any, any>} C
 * @typedef {import("./StrictType.js").StrictType<C>} StrictType
 */
