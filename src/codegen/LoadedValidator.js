import { Cast } from "../cast/Cast.js"

/**
 * @typedef {import("./LoadedModule.js").LoadedModule} LoadedModule
 */

/**
 * @typedef {{
 *   $name: string
 *   $sourceCode: string
 *   $dependencies: LoadedModule[]
 *   $hashDependencies: LoadedValidator[]
 *   $dependsOnOwnHash: boolean
 *   $Redeemer: Cast
 * } & (
 *   {
 *     $purpose: "spending"
 *     $Datum: Cast
 *   } | {
 *     $purpose: "minting" | "certifying" | "rewarding" | "staking"
 *   }
 * )} LoadedValidator
 */
