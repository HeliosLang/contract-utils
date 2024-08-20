import { UserFunc } from "../cast/UserFunc.js"

/**
 * @template TStrict
 * @template TPermissive
 * @typedef {import("../cast/Cast.js").CastLike<TStrict, TPermissive>} CastLike
 */

/**
 * @typedef {import("@helios-lang/uplc").UplcProgram} UplcProgram
 * @typedef {import("./LoadedModule.js").LoadedModule} LoadedModule
 */

/**
 * * Note: `$hashDependencies` doesn't contain the indirect dependencies! It must be kept to a minimum in order to inform in which order the validators must be compiled
 * @typedef {{
 *   $name: string
 *   $sourceCode: string
 *   $dependencies: ReadonlyArray<LoadedModule>
 *   $hashDependencies: ReadonlyArray<LoadedValidator>
 *   $dependsOnOwnHash: boolean
 *   $types: {[name: string]: CastLike<any, any>}
 *   $functions: {[name: string]: (uplc: UplcProgram) => UserFunc<any>}
 *   $Redeemer: CastLike<any, any>
 * } & (
 *   {
 *     $purpose: "spending" | "mixed"
 *     $Datum: CastLike<any, any>
 *   } | {
 *     $purpose: "minting" | "certifying" | "rewarding" | "staking"
 *   }
 * )} LoadedValidator
 */

/**
 * @template {{$name: string}} N
 * @typedef {{
 *   [name in N["$name"]]: Extract<N, {"$name": name}>
 * }} NamedDependencyToObject
 */

/**
 * @template {ReadonlyArray<{$name: string}>} N
 * @typedef {NamedDependencyToObject<N extends ReadonlyArray<infer M> ? M : never>} NamedDependenciesToObject
 */

/**
 * @template {LoadedValidator} V
 * @typedef {NamedDependenciesToObject<V["$dependencies"]>} ExtractDependencies
 */
