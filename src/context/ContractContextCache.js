import { bytesToHex } from "@helios-lang/codec-utils"
import {
    MintingPolicyHash,
    ScriptHash,
    StakingValidatorHash,
    ValidatorHash
} from "@helios-lang/ledger"
import { Cast } from "../cast/Cast.js"
import { None, expectSome } from "@helios-lang/type-utils"
import { UplcProgramV1, UplcProgramV2, UplcSourceMap } from "@helios-lang/uplc"

/**
 * @typedef {import("@helios-lang/uplc").PlutusVersion} PlutusVersion
 * @typedef {import("@helios-lang/uplc").UplcProgram} UplcProgram
 * @typedef {import("@helios-lang/uplc").UplcSourceMapJsonSafe} UplcSourceMapJsonSafe
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
 *     unoptimizedIr?: string
 *     unoptimizedSourceMap?: UplcSourceMapJsonSafe
 *     optimizedCborHex: string
 *     optimizedIr?: string
 *     optimizedSourceMap?: UplcSourceMapJsonSafe
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
 *   unoptimizedSourceMap?: UplcSourceMapJsonSafe
 *   optimizedCborHex: string
 *   optimizedIr?: string
 *   optimizedSourceMap?: UplcSourceMapJsonSafe
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
                        ? UplcProgramV1.fromCbor(props.optimizedCborHex, {
                              ir: props.optimizedIr,
                              sourceMap: props.optimizedSourceMap
                          })
                        : UplcProgramV2.fromCbor(props.optimizedCborHex, {
                              ir: props.optimizedIr,
                              sourceMap: props.optimizedSourceMap
                          })

                if (props.unoptimizedCborHex) {
                    if (program.plutusVersion == "PlutusScriptV1") {
                        program = program.withAlt(
                            UplcProgramV1.fromCbor(props.unoptimizedCborHex, {
                                ir: props.unoptimizedIr,
                                sourceMap: props.unoptimizedSourceMap
                            })
                        )
                    } else if (program.plutusVersion == "PlutusScriptV2") {
                        program = program.withAlt(
                            UplcProgramV2.fromCbor(props.unoptimizedCborHex, {
                                ir: props.unoptimizedIr,
                                sourceMap: props.unoptimizedSourceMap
                            })
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

                /**
                 * @type {UplcProgram}
                 */
                let program =
                    props.plutusVersion == "PlutusScriptV1"
                        ? UplcProgramV1.fromCbor(props.optimizedCborHex, {
                              ir: props.optimizedIr,
                              sourceMap: props.optimizedSourceMap
                          })
                        : UplcProgramV2.fromCbor(props.optimizedCborHex, {
                              ir: props.optimizedIr,
                              sourceMap: props.optimizedSourceMap
                          })

                if (props.unoptimizedCborHex) {
                    if (program.plutusVersion == "PlutusScriptV1") {
                        program = program.withAlt(
                            UplcProgramV1.fromCbor(props.unoptimizedCborHex, {
                                ir: props.unoptimizedIr,
                                sourceMap: props.unoptimizedSourceMap
                            })
                        )
                    } else if (program.plutusVersion == "PlutusScriptV2") {
                        program = program.withAlt(
                            UplcProgramV2.fromCbor(props.unoptimizedCborHex, {
                                ir: props.unoptimizedIr,
                                sourceMap: props.unoptimizedSourceMap
                            })
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

                /**
                 * @type {UplcProgramV1 | UplcProgramV2}
                 */
                const program = hash.context.program

                resValidators[name] = {
                    purpose: purpose,
                    bytes: hash.bytes,
                    optimizedCborHex: bytesToHex(program.toCbor()),
                    unoptimizedCborHex: program.alt
                        ? bytesToHex(program.alt.toCbor())
                        : undefined,
                    optimizedIr:
                        /** @type {UplcProgramV2} */ (program).ir ?? undefined,
                    unoptimizedIr:
                        /** @type {UplcProgramV2} */ (program).alt?.ir ??
                        undefined,
                    optimizedSourceMap: UplcSourceMap.fromUplcTerm(
                        program.root
                    ).toJsonSafe(),
                    unoptimizedSourceMap: program.alt
                        ? UplcSourceMap.fromUplcTerm(
                              program.alt.root
                          ).toJsonSafe()
                        : undefined,
                    plutusVersion: hash.context.program.plutusVersion,
                    castConfig: redeemer.config,
                    redeemer: redeemer.schema,
                    datum: datum?.schema
                }
            }

            for (let name in entry.userFuncs) {
                const userFunc = entry.userFuncs[name]

                resUserFuncs[name] = {
                    optimizedCborHex: bytesToHex(userFunc.toCbor()),
                    unoptimizedCborHex: /** @type {UplcProgramV2} */ (userFunc)
                        .alt
                        ? bytesToHex(
                              /** @type {UplcProgramV2} */ (
                                  userFunc
                              ).alt.toCbor()
                          )
                        : undefined,
                    optimizedIr: userFunc.ir ?? undefined,
                    unoptimizedIr: userFunc.alt?.ir ?? undefined,
                    optimizedSourceMap: UplcSourceMap.fromUplcTerm(
                        userFunc.root
                    ).toJsonSafe(),
                    unoptimizedSourceMap: userFunc.alt
                        ? UplcSourceMap.fromUplcTerm(
                              userFunc.alt.root
                          ).toJsonSafe()
                        : undefined,
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
