export {}

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
 * @typedef {C extends CastLike<any, infer TPermissive> ? TPermissive : never} PermissiveType
 */
