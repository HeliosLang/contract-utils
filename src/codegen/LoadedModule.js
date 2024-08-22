import { UserFunc } from "../cast/UserFunc.js"

/**
 * @typedef {import("@helios-lang/uplc").UplcProgram} UplcProgram
 * @typedef {import("../cast/Cast.js").CastConfig} CastConfig
 */

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
 *   $functions: {[name: string]: (uplc: UplcProgram, config: CastConfig) => UserFunc<any>}
 * }} LoadedModule
 */
