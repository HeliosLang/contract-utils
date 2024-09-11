import { bytesToHex } from "@helios-lang/codec-utils"
import {
    MintingPolicyHash,
    ScriptHash,
    StakingValidatorHash,
    ValidatorHash
} from "@helios-lang/ledger"
import { Cast } from "../cast/Cast.js"
import { None, expectSome } from "@helios-lang/type-utils"
import { UplcProgramV1 } from "@helios-lang/uplc"
import { UplcProgramV2 } from "@helios-lang/uplc"

/**
 * @typedef {import("@helios-lang/uplc").PlutusVersion} PlutusVersion
 * @typedef {import("@helios-lang/uplc").UplcProgram} UplcProgram
 * @typedef {import("../cast/index.js").CastConfig} CastConfig
 * @typedef {import("../codegen/index.js").TypeSchema} TypeSchema
 * @typedef {import("./ContractContext.js").AnyContractValidatorContext} AnyContractValidatorContext
 */

/**
 * @typedef {{
 *   debug?: boolean
 *   validators: {[name: string]: AnyContractValidatorContext}
 *   userFuncs: {[name: string]: UplcProgram}
 * }} CacheEntry
 */

/**
 * @typedef {{[name: string]: {
 *     purpose: "minting" | "spending" | "staking" | "mixed"
 *     bytes: number[]
 *     unoptimizedCborHex?: string
 *     optimizedCborHex: string
 *     plutusVersion: PlutusVersion
 *     castConfig: CastConfig
 *     datum?: TypeSchema
 *     redeemer: TypeSchema
 *   }}} CacheEntryValidatorsJson
 */

/**
 * @typedef {{[name: string]: {
 *   unoptimizedCborHex?: string
 *   unoptimizedIr?: string
 *   optimizedCborHex: string
 *   optimizedIr?: string
 *   plutusVersion: PlutusVersion
 * }}} CacheEntryUserFuncsJson
 */

/**
 * @typedef {{
 *   debug?: boolean
 *   validators: CacheEntryValidatorsJson
 *   userFuncs: CacheEntryUserFuncsJson
 * }} CacheEntryJson
 */

class ContractContextCache {
    /**
     * @type {CacheEntry[]}
     */
    cache

    /**
     * Load count
     * @type {number}
     */
    i

    /**
     * @type {boolean}
     */
    enabled

    constructor() {
        this.cache = []
        this.enabled = false
        this.i = 0
    }

    enable() {
        this.enabled = true
    }

    /**
     * @param {CacheEntryJson[]} json
     */
    load(json) {
        this.cache = json.map((entry) => {
            /**
             * @type {CacheEntry}
             */
            const res = {
                debug: entry.debug ?? false,
                validators: {},
                userFuncs: {}
            }

            for (let name in entry.validators) {
                const props = entry.validators[name]

                /**
                 * @type {UplcProgram}
                 */
                let program =
                    props.plutusVersion == "PlutusScriptV1"
                        ? UplcProgramV1.fromCbor(props.optimizedCborHex)
                        : UplcProgramV2.fromCbor(props.optimizedCborHex)

                if (props.unoptimizedCborHex) {
                    if (program.plutusVersion == "PlutusScriptV1") {
                        program = program.withAlt(
                            UplcProgramV1.fromCbor(props.unoptimizedCborHex)
                        )
                    } else if (program.plutusVersion == "PlutusScriptV2") {
                        program = program.withAlt(
                            UplcProgramV2.fromCbor(props.unoptimizedCborHex)
                        )
                    } else {
                        throw new Error("unhandled Plutus version")
                    }
                }

                let redeemer = new Cast(props.redeemer, props.castConfig)

                switch (props.purpose) {
                    case "spending": {
                        res.validators[name] = new ValidatorHash(props.bytes, {
                            datum: new Cast(
                                expectSome(props.datum),
                                props.castConfig
                            ),
                            redeemer: redeemer,
                            program: program
                        })
                        break
                    }
                    case "minting": {
                        res.validators[name] = new MintingPolicyHash(
                            props.bytes,
                            {
                                redeemer: redeemer,
                                program: program
                            }
                        )
                        break
                    }
                    case "staking": {
                        res.validators[name] = new StakingValidatorHash(
                            props.bytes,
                            {
                                redeemer: redeemer,
                                program: program
                            }
                        )
                        break
                    }
                    case "mixed": {
                        res.validators[name] = new ScriptHash(props.bytes, {
                            datum: new Cast(
                                expectSome(props.datum),
                                props.castConfig
                            ),
                            redeemer: redeemer,
                            program: program
                        })
                        break
                    }
                    default:
                        throw new Error("unhandled purpose")
                }
            }

            for (let name in entry.userFuncs) {
                const props = entry.userFuncs[name]

                const optimizedIr = props.optimizedIr
                const optimizedProps = optimizedIr
                    ? { ir: () => optimizedIr }
                    : {}

                /**
                 * @type {UplcProgram}
                 */
                let program =
                    props.plutusVersion == "PlutusScriptV1"
                        ? UplcProgramV1.fromCbor(
                              props.optimizedCborHex,
                              optimizedProps
                          )
                        : UplcProgramV2.fromCbor(
                              props.optimizedCborHex,
                              optimizedProps
                          )

                if (props.unoptimizedCborHex) {
                    const unoptimizedIr = props.unoptimizedIr
                    const unoptimizedProps = unoptimizedIr
                        ? { ir: () => unoptimizedIr }
                        : {}

                    if (program.plutusVersion == "PlutusScriptV1") {
                        program = program.withAlt(
                            UplcProgramV1.fromCbor(
                                props.unoptimizedCborHex,
                                unoptimizedProps
                            )
                        )
                    } else if (program.plutusVersion == "PlutusScriptV2") {
                        program = program.withAlt(
                            UplcProgramV2.fromCbor(
                                props.unoptimizedCborHex,
                                unoptimizedProps
                            )
                        )
                    } else {
                        throw new Error("unhandled Plutus version")
                    }
                }
                res.userFuncs[name] = program
            }

            return res
        })
    }

    /**
     * @param {CacheEntry} hashes
     */
    push(hashes) {
        if (this.enabled) {
            this.cache.push(hashes)
        }
    }

    /**
     * @returns {Option<CacheEntry>}
     */
    shift() {
        if (this.i >= this.cache.length) {
            return None
        }

        const res = this.cache[this.i]

        this.i += 1

        return res
    }

    /**
     * @return {CacheEntryJson[]}
     */
    toJson() {
        return this.cache.map((entry) => {
            /**
             * @type {CacheEntryValidatorsJson}
             */
            const resValidators = {}

            /**
             * @type {CacheEntryUserFuncsJson}
             */
            const resUserFuncs = {}

            for (let name in entry.validators) {
                const hash = entry.validators[name]

                const purpose =
                    hash instanceof ValidatorHash
                        ? "spending"
                        : hash instanceof MintingPolicyHash
                          ? "minting"
                          : hash instanceof StakingValidatorHash
                            ? "staking"
                            : hash instanceof ScriptHash
                              ? "mixed"
                              : "unknown"
                if (purpose == "unknown") {
                    throw new Error("unhandled hash type")
                }

                const redeemer =
                    hash.context.redeemer instanceof Cast
                        ? hash.context.redeemer
                        : None

                if (!redeemer) {
                    throw new Error("Redeemer is not a Cast type")
                }

                /**
                 * @type {Option<Cast>}
                 */
                let datum = None

                if (hash.context.datum && hash.context.datum instanceof Cast) {
                    datum = hash.context.datum
                }

                if (["spending", "mixed"].includes(purpose) && !datum) {
                    throw new Error("Datum is not a Cast type")
                }

                resValidators[name] = {
                    purpose: purpose,
                    bytes: hash.bytes,
                    optimizedCborHex: bytesToHex(hash.context.program.toCbor()),
                    unoptimizedCborHex: hash.context.program.alt
                        ? bytesToHex(hash.context.program.alt.toCbor())
                        : undefined,
                    plutusVersion: hash.context.program.plutusVersion,
                    castConfig: redeemer.config,
                    redeemer: redeemer.schema,
                    datum: datum?.schema
                }
            }

            for (let name in entry.userFuncs) {
                const userFunc = entry.userFuncs[name]
                const optimizedIr = userFunc.ir

                resUserFuncs[name] = {
                    optimizedCborHex: bytesToHex(userFunc.toCbor()),
                    optimizedIr: optimizedIr ?? undefined,
                    unoptimizedCborHex: /** @type {UplcProgramV2} */ (userFunc)
                        .alt
                        ? bytesToHex(
                              /** @type {UplcProgramV2} */ (
                                  userFunc
                              ).alt.toCbor()
                          )
                        : undefined,
                    unoptimizedIr: userFunc?.alt?.ir ?? undefined,
                    plutusVersion: userFunc.plutusVersion
                }
            }

            return {
                debug: entry.debug ?? false,
                validators: resValidators,
                userFuncs: resUserFuncs
            }
        })
    }
}

export const contractContextCache = new ContractContextCache()
