import { ScriptHash } from "@helios-lang/ledger"
import { UplcProgramV2 } from "@helios-lang/uplc"
import { Cast } from "./Cast.js"

/**
 * @typedef {{
 *   $name: string
 *   $purpose: string
 *   $program: {
 *     optimized: UplcProgramV2
 *     unoptimized: UplcProgramV2
 *   }
 *   $hash: ScriptHash
 *   $Redeemer: Cast<any, any>
 *   $Datum?: Cast<any, any>
 * }} Validator
 */

/**
 * @template {{[name: string]: Validator}} T
 */
export class ContractContext {
    /**
     * @readonly
     * @type {T}
     */
    validators

    /**
     * @param {T} validators
     */
    constructor(validators) {
        this.validators = validators
    }
}
