import { bytesToHex } from "@helios-lang/codec-utils"
import {
    ScriptHash,
    StakingValidatorHash,
    ValidatorHash,
    MintingPolicyHash
} from "@helios-lang/ledger"
import { None, expectSome } from "@helios-lang/type-utils"
import { UplcProgramV2 } from "@helios-lang/uplc"
import { loadLibrary } from "../lib/index.js"
import { Cast } from "./Cast.js"
import { ContractContext } from "./ContractContext.js"

/**
 * @typedef {import("./ContractContext.js").Validator} CompiledValidator
 */

/**
 * @template TRedeemerStrict
 * @template TRedeemerPermissive
 * @typedef {import("@helios-lang/ledger").MintingContext<TRedeemerStrict, TRedeemerPermissive>} MintingContext
 */

/**
 * @template TDatumStrict
 * @template TDatumPermissive
 * @template TRedeemerStrict
 * @template TRedeemerPermissive
 * @typedef {import("@helios-lang/ledger").SpendingContext<TDatumStrict, TDatumPermissive, TRedeemerStrict, TRedeemerPermissive>} SpendingContext
 */

/**
 * @template TRedeemerStrict
 * @template TRedeemerPermissive
 * @typedef {import("@helios-lang/ledger").StakingContext<TRedeemerStrict, TRedeemerPermissive>} StakingContext
 */

/**
 * @template {Cast} C
 * @typedef {import("./PermissiveType.js").PermissiveType<C>} PermissiveType
 */

/**
 * @template {Cast} C
 * @typedef {import("./StrictType.js").StrictType<C>} StrictType
 */

/**
 * @typedef {{
 *   $name: string
 *   $sourceCode: string
 *   $dependencies: Module[]
 * }} Module
 */

/**
 * @typedef {{
 *   $name: string
 *   $purpose: string
 *   $sourceCode: string
 *   $dependencies: Module[]
 *   $hashDependencies: Validator[]
 *   $dependsOnOwnHash: boolean
 *   $Redeemer: Cast<any, any>
 *   $Datum?: Cast<any, any>
 * }} Validator
 */

/**
 * @template {{[name: string]: Validator}} T
 */
export class ContractContextBuilder {
    /**
     * @private
     * @readonly
     * @type {T}
     */
    validators

    /**
     * @private
     * @param {T} validators
     */
    constructor(validators) {
        this.validators = validators
    }

    /**
     * @returns {ContractContextBuilder<{}>}
     */
    static new() {
        return new ContractContextBuilder({})
    }

    /**
     * @template {Validator} V
     * @param {V} validator
     * @returns {ContractContextBuilder<T & {
     *   [K in V["$name"]]: V
     * }>}
     */
    with(validator) {
        return new ContractContextBuilder({
            ...this.validators,
            [validator.$name]: validator
        })
    }

    /**
     *
     * @param {Option<{[name: string]: string}>} expectedHashes
     * @returns {{
     *   [K in keyof T]:
     *     T[K]["$purpose"] extends "spending" ? ValidatorHash<
     *       SpendingContext<
     *         StrictType<T[K]["$Datum"]>,
     *         PermissiveType<T[K]["$Datum"]>,
     *         StrictType<T[K]["$Redeemer"]>,
     *         PermissiveType<T[K]["$Redeemer"]>
     *       >
     *     > :
     *     T[K]["$purpose"] extends "minting" ? MintingPolicyHash<
     *       MintingContext<
     *         StrictType<T[K]["$Redeemer"]>,
     *         PermissiveType<T[K]["$Redeemer"]>
     *       >
     *     > :
     *     T[K]["$purpose"] extends ("certifying" | "rewarding") ? StakingValidatorHash<
     *       StakingContext<
     *         StrictType<T[K]["$Redeemer"]>,
     *         PermissiveType<T[K]["$Redeemer"]>
     *       >
     *     > : never
     * }}
     */
    build(expectedHashes = None) {
        const lib = loadLibrary()

        /**
         * @type {{[name: string]: (
         *   ValidatorHash<SpendingContext<any, any, any, any>> |
         *   MintingPolicyHash<MintingContext<any, any>> |
         *   StakingValidatorHash<StakingContext<any, any>>
         * )}}
         */
        const validators = {}

        /**
         * @param {Validator} validator
         * @returns {Map<string, string>}
         */
        function collectModules(validator) {
            /**
             * @type {Map<string, string>}
             */
            const result = new Map()

            let stack = validator.$dependencies.slice()

            let m = stack.pop()

            while (m) {
                if (!result.has(m.$name)) {
                    result.set(m.$name, m.$sourceCode)

                    stack = stack.concat(m.$dependencies)
                }

                m = stack.pop()
            }

            return result
        }

        /**
         * @returns {{[name: string]: {purpose: string, hash: string}}}
         */
        function getOtherValidators() {
            /**
             * @type {{[name: string]: {purpose: string, hash: string}}}
             */
            const otherValidators = {}

            for (let k in validators) {
                const v = validators[k]

                if (v instanceof ValidatorHash) {
                    otherValidators[k] = {
                        purpose: "spending",
                        hash: v.toHex()
                    }
                } else if (v instanceof MintingPolicyHash) {
                    otherValidators[k] = {
                        purpose: "minting",
                        hash: v.toHex()
                    }
                } else if (v instanceof StakingValidatorHash) {
                    otherValidators[k] = {
                        purpose: "staking",
                        hash: v.toHex()
                    }
                } else {
                    throw new Error("unexpected ScriptHash")
                }
            }

            return otherValidators
        }

        /**
         * @param {Validator} validator
         */
        function buildValidator(validator) {
            const name = validator.$name

            if (name in validator) {
                return
            }

            for (let v of validator.$hashDependencies) {
                buildValidator(v)
            }

            const modules = collectModules(validator)

            const otherValidators = getOtherValidators()

            const { cborHex: optimizedCborHex } = lib.compile(
                validator.$sourceCode,
                Array.from(modules.values()),
                {
                    optimize: true,
                    otherValidators: getOtherValidators(),
                    dependsOnOwnHash: validator.$dependsOnOwnHash
                }
            )

            const optimizedProgram = UplcProgramV2.fromCbor(optimizedCborHex)

            const ownHash = bytesToHex(optimizedProgram.hash())

            if (expectedHashes && name in expectedHashes) {
                if (expectedHashes[name] != ownHash) {
                    throw new Error(
                        `expected hash ${expectedHashes[name]} for validator ${name}, got ${ownHash}`
                    )
                }
            }

            /**
             * @type {ScriptHash}
             */
            let ownTypedHash

            const purpose = validator.$purpose

            switch (purpose) {
                case "spending":
                    ownTypedHash = new ValidatorHash(ownHash)
                    break
                case "minting":
                    ownTypedHash = new MintingPolicyHash(ownHash)
                    break
                case "staking":
                case "certifying":
                case "rewarding":
                    ownTypedHash = new StakingValidatorHash(ownHash)
                    break
                default:
                    throw new Error("unhandled purpose")
            }

            const { cborHex: unoptimizedCborHex } = lib.compile(
                validator.$sourceCode,
                Array.from(modules.values()),
                {
                    optimize: false,
                    otherValidators: getOtherValidators(),
                    ownHash: validator.$dependsOnOwnHash ? ownHash : undefined
                }
            )

            const unoptimizedProgram =
                UplcProgramV2.fromCbor(unoptimizedCborHex)

            if (purpose == "spending") {
                validators[validator.$name] = new ValidatorHash(
                    ownTypedHash.bytes,
                    {
                        program: optimizedProgram.withAlt(unoptimizedProgram),
                        datum: expectSome(validator.$Datum),
                        redeemer: validator.$Redeemer
                    }
                )
            } else if (purpose == "minting") {
                validators[validator.$name] = new MintingPolicyHash(
                    ownTypedHash.bytes,
                    {
                        program: optimizedProgram.withAlt(unoptimizedProgram),
                        redeemer: validator.$Redeemer
                    }
                )
            } else if (
                purpose == "staking" ||
                purpose == "certifying" ||
                purpose == "rewarding"
            ) {
                validators[validator.$name] = new StakingValidatorHash(
                    ownTypedHash.bytes,
                    {
                        program: optimizedProgram.withAlt(unoptimizedProgram),
                        redeemer: validator.$Redeemer
                    }
                )
            } else {
                throw new Error("unhandled purpose")
            }
        }

        for (let k in this.validators) {
            buildValidator(this.validators[k])
        }

        return /** @type {any} */ (validators)
    }
}
