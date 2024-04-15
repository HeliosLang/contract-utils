export {}

/**
 * @template TStrict
 * @template TPermissive
 * @typedef {import("../cast/Cast.js").CastLike<TStrict, TPermissive>} CastLike
 */

/**
 * @typedef {{
 *   $name: string
 *   $purpose: "module"
 *   $sourceCode: string
 *   $dependencies: ReadonlyArray<LoadedModule>
 *   $types: {[name: string]: CastLike<any, any>}
 * }} LoadedModule
 */
