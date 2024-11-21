import { bytesToHex } from "@helios-lang/codec-utils"
import {
    makeMintingPolicyHash,
    makeStakingValidatorHash,
    makeValidatorHash
} from "@helios-lang/ledger"
import { expectDefined } from "@helios-lang/type-utils"
import {
    decodeUplcProgramV1FromCbor,
    decodeUplcProgramV2FromCbor,
    makeUplcSourceMap
} from "@helios-lang/uplc"
import { makeCast } from "../cast/Cast.js"

/**
 * @import { TypeSchema } from "@helios-lang/type-utils"
 * @import { PlutusVersion, UplcData, UplcProgram, UplcProgramV1, UplcProgramV2, UplcSourceMapJsonSafe } from "@helios-lang/uplc"
 * @import { AnyContractValidatorContext, Cast, CastConfig, LoadedModule, LoadedValidator } from "../index.js"
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

/**
 * @param {CacheEntry} entry
 * @returns {CacheEntryJson}
 */
export function cacheEntryToJsonSafe(entry) {
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
            hash.kind == "ValidatorHash"
                ? "spending"
                : hash.kind == "MintingPolicyHash"
                  ? "minting"
                  : hash.kind == "StakingValidatorHash"
                    ? "staking"
                    : "mixed"

        const context = hash.context

        if (
            !(
                typeof hash.context == "object" &&
                hash.context !== null &&
                "redeemer" in hash.context &&
                "program" in hash.context
            )
        ) {
            throw new Error("invalid context")
        }

        /**
         * @type {Cast<any, any> | undefined}
         */
        const redeemer = /** @type {any} */ (
            typeof hash.context.redeemer == "object" &&
            hash.context.redeemer !== null &&
            "kind" in hash.context.redeemer &&
            hash.context.redeemer.kind == "Cast"
                ? hash.context.redeemer
                : undefined
        )

        if (!redeemer) {
            throw new Error("Redeemer is not a Cast type")
        }

        /**
         * @type {Cast<any, any> | undefined}
         */
        let datum = undefined

        if (
            "datum" in hash.context &&
            hash.context.datum &&
            typeof hash.context.datum == "object" &&
            hash.context.datum !== null &&
            "kind" in hash.context.datum &&
            hash.context.datum.kind == "Cast"
        ) {
            datum = /** @type {any} */ (hash.context.datum)
        }

        if (["spending", "mixed"].includes(purpose) && !datum) {
            throw new Error("Datum is not a Cast type")
        }

        /**
         * @type {UplcProgramV1 | UplcProgramV2}
         */
        const program = /** @type {any} */ (hash.context.program)

        resValidators[name] = {
            purpose: purpose,
            bytes: hash.bytes,
            optimizedCborHex: bytesToHex(program.toCbor()),
            unoptimizedCborHex: program.alt
                ? bytesToHex(program.alt.toCbor())
                : undefined,
            optimizedIr: /** @type {UplcProgramV2} */ (program).ir ?? undefined,
            unoptimizedIr:
                /** @type {UplcProgramV2} */ (program).alt?.ir ?? undefined,
            optimizedSourceMap: makeUplcSourceMap({
                term: program.root
            }).toJsonSafe(),
            unoptimizedSourceMap: program.alt
                ? makeUplcSourceMap({ term: program.alt.root }).toJsonSafe()
                : undefined,
            plutusVersion: program.plutusVersion,
            castConfig: redeemer.config,
            redeemer: redeemer.schema,
            datum: datum?.schema
        }
    }

    for (let name in entry.userFuncs) {
        const userFunc = entry.userFuncs[name]

        resUserFuncs[name] = {
            optimizedCborHex: bytesToHex(userFunc.toCbor()),
            unoptimizedCborHex: /** @type {UplcProgramV2} */ (userFunc).alt
                ? bytesToHex(
                      /** @type {UplcProgramV2} */ (userFunc).alt.toCbor()
                  )
                : undefined,
            optimizedIr: userFunc.ir ?? undefined,
            unoptimizedIr: userFunc.alt?.ir ?? undefined,
            optimizedSourceMap: makeUplcSourceMap({
                term: userFunc.root
            }).toJsonSafe(),
            unoptimizedSourceMap: userFunc.alt
                ? makeUplcSourceMap({ term: userFunc.alt.root }).toJsonSafe()
                : undefined,
            plutusVersion: userFunc.plutusVersion
        }
    }

    return {
        debug: entry.debug ?? false,
        validators: resValidators,
        userFuncs: resUserFuncs
    }
}

/**
 * @param {CacheEntryJson} entry
 * @returns {CacheEntry}
 */
export function cacheEntryFromJson(entry) {
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
                ? decodeUplcProgramV1FromCbor(props.optimizedCborHex, {
                      ir: props.optimizedIr,
                      sourceMap: props.optimizedSourceMap
                  })
                : decodeUplcProgramV2FromCbor(props.optimizedCborHex, {
                      ir: props.optimizedIr,
                      sourceMap: props.optimizedSourceMap
                  })

        if (props.unoptimizedCborHex) {
            if (program.plutusVersion == "PlutusScriptV1") {
                program = program.withAlt(
                    decodeUplcProgramV1FromCbor(props.unoptimizedCborHex, {
                        ir: props.unoptimizedIr,
                        sourceMap: props.unoptimizedSourceMap
                    })
                )
            } else if (program.plutusVersion == "PlutusScriptV2") {
                program = program.withAlt(
                    decodeUplcProgramV2FromCbor(props.unoptimizedCborHex, {
                        ir: props.unoptimizedIr,
                        sourceMap: props.unoptimizedSourceMap
                    })
                )
            } else {
                throw new Error("unhandled Plutus version")
            }
        }

        let redeemer = makeCast(props.redeemer, props.castConfig)

        switch (props.purpose) {
            case "spending": {
                res.validators[name] = makeValidatorHash(props.bytes, {
                    datum: makeCast(
                        expectDefined(props.datum),
                        props.castConfig
                    ),
                    redeemer: redeemer,
                    program: program
                })
                break
            }
            case "minting": {
                res.validators[name] = makeMintingPolicyHash(props.bytes, {
                    redeemer: redeemer,
                    program: program
                })
                break
            }
            case "staking": {
                res.validators[name] = makeStakingValidatorHash(props.bytes, {
                    redeemer: redeemer,
                    program: program
                })
                break
            }
            case "mixed": {
                throw new Error("implement ScriptHash type")
                /*res.validators[name] = new ScriptHash(props.bytes, {
                    datum: makeCast(expectDefined(props.datum), props.castConfig),
                    redeemer: redeemer,
                    program: program
                })*/
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
                ? decodeUplcProgramV1FromCbor(props.optimizedCborHex, {
                      ir: props.optimizedIr,
                      sourceMap: props.optimizedSourceMap
                  })
                : decodeUplcProgramV2FromCbor(props.optimizedCborHex, {
                      ir: props.optimizedIr,
                      sourceMap: props.optimizedSourceMap
                  })

        if (props.unoptimizedCborHex) {
            if (program.plutusVersion == "PlutusScriptV1") {
                program = program.withAlt(
                    decodeUplcProgramV1FromCbor(props.unoptimizedCborHex, {
                        ir: props.unoptimizedIr,
                        sourceMap: props.unoptimizedSourceMap
                    })
                )
            } else if (program.plutusVersion == "PlutusScriptV2") {
                program = program.withAlt(
                    decodeUplcProgramV2FromCbor(props.unoptimizedCborHex, {
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
}
