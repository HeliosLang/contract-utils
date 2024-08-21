import { bytesToHex } from "@helios-lang/codec-utils"
import {
    MintingPolicyHash,
    StakingValidatorHash,
    ValidatorHash
} from "@helios-lang/ledger"
import { None, expectSome, isSome } from "@helios-lang/type-utils"
import { UplcProgramV1, UplcProgramV2 } from "@helios-lang/uplc"
import { configureCast } from "../cast/index.js"

/**
 * @typedef {import("@helios-lang/uplc").UplcProgram} UplcProgram
 * @typedef {import("../cast/index.js").CastConfig} CastConfig
 * @typedef {import("../codegen/LoadedValidator.js").LoadedValidator} LoadedValidator
 * @typedef {import("../compiler/index.js").CompilerLib} CompilerLib
 * @typedef {import("./ContractContext.js").AnyContractValidatorContext} AnyContractValidatorContext
 */

/**
 * @typedef {{
 *   validators: {[name: string]: AnyContractValidatorContext}
 *   userFuncs: {[name: string]: UplcProgram}
 * }} DagCompilerOutput
 */

/**
 * Compiles a set of validators that depend on eachothers hashes (forming a Directed Acyclical Graph)
 */
export class DagCompiler {
    /**
     * @private
     * @readonly
     * @type {CompilerLib}
     */
    lib

    /**
     * @private
     * @readonly
     * @type {CastConfig}
     */
    config

    /**
     * @private
     * @readonly
     * @type {{[name: string]: AnyContractValidatorContext}}
     */
    cachedValidators

    /**
     * @private
     * @readonly
     * @type {{[name: string]: UplcProgram}}
     */
    cachedUserFuncs

    /**
     * @param {CompilerLib} lib
     * @param {CastConfig} castConfig
     */
    constructor(lib, castConfig) {
        this.lib = lib
        this.castConfig = castConfig
        this.cachedValidators = {}
        this.cachedUserFuncs = {}
    }

    /**
     * @param {LoadedValidator[]} validators
     * @param {Record<string, any>} parameters
     * @param {boolean} isTestnet
     * @param {Option<{[name: string]: string}>} expectedHashes
     * @returns {DagCompilerOutput}
     */
    build(validators, parameters, isTestnet, expectedHashes = None) {
        const hashTypes = this.getHashTypes(validators)
        const validatorIndices = this.getValidatorIndices(validators)

        /**
         * `buildValidator()` is a closure instead of a member method of DagCompiler
         *    because this way we have easy access to `hashTypes` and `expectedHashes`
         * @param {LoadedValidator} validator
         */
        const buildValidator = (validator) => {
            const name = validator.$name
            const sourceCode = validator.$sourceCode

            // if already built before, return immediately
            if (name in this.cachedValidators) {
                return
            }

            // make sure all the hash dependencies are built first
            validator.$hashDependencies.forEach((v) => buildValidator(v))

            // get the dependencies
            const hashDepHashes = this.getHashDepHashes(
                validator,
                Object.keys(hashTypes)
            )
            const moduleDeps = getModuleDependencies(validator)

            const excludeUserFuncs = new Set(Object.keys(this.cachedUserFuncs))

            // optimized compilation
            const { cborHex: optimizedCborHex } = this.lib.compile(
                sourceCode,
                moduleDeps,
                {
                    optimize: true,
                    hashDependencies: hashDepHashes,
                    allValidatorHashTypes: hashTypes,
                    allValidatorIndices: validatorIndices ?? undefined,
                    dependsOnOwnHash: validator.$dependsOnOwnHash,
                    parameters: parameters,
                    isTestnet: isTestnet,
                    excludeUserFuncs: excludeUserFuncs,
                    onCompileUserFunc: (name, cborHex, plutusVersion) => {
                        this.cachedUserFuncs[name] =
                            plutusVersion == "PlutusScriptV1"
                                ? UplcProgramV1.fromCbor(cborHex)
                                : UplcProgramV2.fromCbor(cborHex)
                    }
                }
            )

            const optimizedProgram = UplcProgramV2.fromCbor(optimizedCborHex)

            // calculate the hash
            const ownHash = bytesToHex(optimizedProgram.hash())

            // optionally assert the own hash is equal to a given hash
            if (expectedHashes && name in expectedHashes) {
                if (expectedHashes[name] != ownHash) {
                    throw new Error(
                        `expected hash ${expectedHashes[name]} for validator ${name}, got ${ownHash}`
                    )
                }
            }

            // unoptimized compilation (so traces are untouched)
            const { cborHex: unoptimizedCborHex } = this.lib.compile(
                validator.$sourceCode,
                Array.from(moduleDeps.values()),
                {
                    optimize: false,
                    hashDependencies: hashDepHashes,
                    allValidatorHashTypes: hashTypes,
                    ownHash: validator.$dependsOnOwnHash ? ownHash : undefined,
                    parameters: parameters,
                    isTestnet: isTestnet,
                    excludeUserFuncs: excludeUserFuncs,
                    onCompileUserFunc: (name, cborHex, plutusVersion) => {
                        const prev = expectSome(this.cachedUserFuncs[name])

                        if (plutusVersion == "PlutusScriptV1") {
                            if (prev instanceof UplcProgramV1) {
                                this.cachedUserFuncs[name] =
                                    UplcProgramV1.fromCbor(cborHex).withAlt(
                                        prev
                                    )
                            } else {
                                throw new Error("previous not UplcProgramV1")
                            }
                        } else if (plutusVersion == "PlutusScriptV2") {
                            if (prev instanceof UplcProgramV2) {
                                this.cachedUserFuncs[name] =
                                    UplcProgramV2.fromCbor(cborHex).withAlt(
                                        prev
                                    )
                            } else {
                                throw new Error("previous not UplcProgramV2")
                            }
                        } else {
                            throw new Error(
                                `unhandled PlutusVersion ${plutusVersion}`
                            )
                        }
                    }
                }
            )

            // TODO: with source mapping
            const unoptimizedProgram =
                UplcProgramV2.fromCbor(unoptimizedCborHex)

            // add result to cache (unoptimizedProgram is attached to optimizedProgram)
            this.addValidatorToCache(
                validator,
                optimizedProgram.withAlt(unoptimizedProgram),
                ownHash
            )
        }

        validators.forEach((v) => buildValidator(v))

        return {
            validators: this.cachedValidators,
            userFuncs: this.cachedUserFuncs
        }
    }

    /**
     * @private
     * @param {LoadedValidator} validator
     * @param {UplcProgramV2} program
     * @param {string} hash - although this can be derived from `program`, reuse this to save some effort
     */
    addValidatorToCache(validator, program, hash) {
        const name = validator.$name
        const redeemer = configureCast(validator.$Redeemer, this.castConfig)

        switch (validator.$purpose) {
            case "spending":
                this.cachedValidators[name] = new ValidatorHash(hash, {
                    program,
                    redeemer,
                    datum: configureCast(validator.$Datum, this.castConfig)
                })
                break
            case "minting":
                this.cachedValidators[name] = new MintingPolicyHash(hash, {
                    program,
                    redeemer
                })
                break
            case "certifying":
            case "rewarding":
            case "staking":
                this.cachedValidators[name] = new StakingValidatorHash(hash, {
                    program,
                    redeemer
                })
                break
            default:
                throw new Error("unhandled purpose")
        }
    }

    /**
     * @private
     * @param {LoadedValidator} validator
     * @param {string[]} allValidators - add a dummy `#` for all validators that aren't hash dependencies (the optimizer will remove them, but the IR name resolution will fail if we don't have them)
     * @returns {{[name: string]: string}} - TODO: do we really need the purpose?
     */
    getHashDepHashes(validator, allValidators) {
        /**
         * @type {{[name: string]: string}}
         */
        const hashes = {}

        validator.$hashDependencies.forEach((dep) => {
            const k = dep.$name
            const v = this.cachedValidators[k]

            if (!v) {
                throw new Error(
                    `${k} should've been built before ${validator.$name}`
                )
            }

            hashes[k] = v.toHex()
        })

        allValidators.forEach((v) => {
            if (!(v in hashes)) {
                hashes[v] = "#"
            }
        })

        return hashes
    }

    /**
     * Also returns the hash types of any hash-dependencies
     * @private
     * @param {LoadedValidator[]} validators
     * @returns {Record<string, any>}
     */
    getHashTypes(validators) {
        /**
         * @type {Record<string, any>}
         */
        const res = {}

        /**
         * @param {ReadonlyArray<LoadedValidator>} vs
         */
        const addHashes = (vs) => {
            vs.forEach((v) => {
                res[v.$name] = this.lib.getScriptHashType(v.$purpose)

                addHashes(v.$hashDependencies)
            })
        }

        addHashes(validators)

        return res
    }

    /**
     * If any $currentScriptIndex is missing, None is returned
     * @private
     * @param {LoadedValidator[]} validators
     * @returns {Option<Record<string, number>>}
     */
    getValidatorIndices(validators) {
        /**
         * @type {Record<string, number>}
         */
        const res = {}

        for (let v of validators) {
            if (isSome(v.$currentScriptIndex)) {
                res[v.$name] = v.$currentScriptIndex
            } else {
                return None
            }
        }

        return res
    }
}

/**
 * @param {LoadedValidator} validator
 * @returns {string[]}
 */
export function getModuleDependencies(validator) {
    /**
     * @type {Map<string, string>}
     */
    const deps = new Map()

    let stack = validator.$dependencies.slice()
    let m = stack.pop()

    while (m) {
        if (!deps.has(m.$name)) {
            deps.set(m.$name, m.$sourceCode)

            stack = stack.concat(m.$dependencies)
        }

        m = stack.pop()
    }

    return Array.from(deps.values())
}
