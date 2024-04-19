import { bytesToHex } from "@helios-lang/codec-utils"
import {
    MintingPolicyHash,
    StakingValidatorHash,
    ValidatorHash
} from "@helios-lang/ledger"
import { Cast } from "../cast/Cast.js"
import { None, expectSome } from "@helios-lang/type-utils"
import { UplcProgramV1 } from "@helios-lang/uplc"
import { UplcProgramV2 } from "@helios-lang/uplc"

/**
 * @typedef {import("@helios-lang/uplc").PlutusVersion} PlutusVersion
 * @typedef {import("../cast/index.js").CastConfig} CastConfig
 * @typedef {import("../codegen/index.js").TypeSchema} TypeSchema
 * @typedef {import("./ContractContext.js").AnyContractValidatorContext} AnyContractValidatorContext
 */

/**
 * @typedef {{[name: string]: AnyContractValidatorContext}} CacheEntry
 */

/**
 * @typedef {{[name: string]: {
 *   purpose: "minting" | "spending" | "staking"
 *   bytes: number[]
 *   unoptimizedCborHex?: string
 *   optimizedCborHex: string
 *   plutusVersion: PlutusVersion
 *   castConfig: CastConfig
 *   datum?: TypeSchema
 *   redeemer: TypeSchema
 * }}} CacheEntryJson
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
            const res = {}

            for (let name in entry) {
                const props = entry[name]

                let program =
                    props.plutusVersion == "PlutusScriptV1"
                        ? UplcProgramV1.fromCbor(props.optimizedCborHex)
                        : UplcProgramV2.fromCbor(props.optimizedCborHex)

                if (props.unoptimizedCborHex) {
                    if (program instanceof UplcProgramV1) {
                        program = program.withAlt(
                            UplcProgramV1.fromCbor(props.unoptimizedCborHex)
                        )
                    } else if (program instanceof UplcProgramV2) {
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
                        res[name] = new ValidatorHash(props.bytes, {
                            datum: new Cast(
                                expectSome(props.datum),
                                props.castConfig
                            ),
                            redeemer: redeemer,
                            program: program
                        })
                    }
                    case "minting": {
                        res[name] = new MintingPolicyHash(props.bytes, {
                            redeemer: redeemer,
                            program: program
                        })
                    }
                    case "staking": {
                        res[name] = new StakingValidatorHash(props.bytes, {
                            redeemer: redeemer,
                            program: program
                        })
                    }
                    default:
                        throw new Error("unhandled purpose")
                }
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
             * @type {CacheEntryJson}
             */
            const res = {}

            for (let name in entry) {
                const hash = entry[name]

                const purpose =
                    hash instanceof ValidatorHash
                        ? "spending"
                        : hash instanceof MintingPolicyHash
                          ? "minting"
                          : hash instanceof StakingValidatorHash
                            ? "staking"
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

                if (hash instanceof ValidatorHash) {
                    datum =
                        hash.context.datum instanceof Cast
                            ? hash.context.datum
                            : None

                    if (!datum) {
                        throw new Error("Datum is not a Cast type")
                    }
                }

                res[name] = {
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

            return res
        })
    }
}

export const contractContextCache = new ContractContextCache()
