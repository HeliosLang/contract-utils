import { bytesToHex } from "@helios-lang/codec-utils"
import {
    makeMintingPolicyHash,
    makeStakingValidatorHash,
    makeValidatorHash
} from "@helios-lang/ledger"
import {
    expectDefined as expectSome,
    isDefined as isSome
} from "@helios-lang/type-utils"
import { restoreUplcProgram } from "@helios-lang/uplc"
import { configureCast } from "../cast/index.js"

/**
 * @import { UplcData, UplcProgram, UplcProgramV2 } from "@helios-lang/uplc"
 * @import { AnyContractValidatorContext, CastConfig, CompilerLib, LoadedValidator} from "../index.js"
 */

/**
 * @typedef {CastConfig & {
 *   debug?: boolean
 * }} DagCompilerConfig
 */
/**
 * if `debug` is true, the ir is included in the user functions where possible
 * @typedef {{
 *   debug?: boolean
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
     * @type {DagCompilerConfig}
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
     * @param {DagCompilerConfig} config
     */
    constructor(lib, config) {
        this.lib = lib
        this.config = config
        this.cachedValidators = {}
        this.cachedUserFuncs = {}
    }

    /**
     * @param {LoadedValidator[]} validators
     * @param {Record<string, UplcData>} parameters
     * @param {boolean} isTestnet
     * @param {{[name: string]: string} | undefined} expectedHashes
     * @returns {DagCompilerOutput}
     */
    build(validators, parameters, isTestnet, expectedHashes = undefined) {
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
            const {
                cborHex: optimizedCborHex,
                plutusVersion: optimPlutusVersion,
                ir: optimIr,
                sourceMap: optimSourceMap
            } = this.lib.compile(sourceCode, moduleDeps, {
                optimize: true,
                debug: this.config.debug ?? false,
                hashDependencies: hashDepHashes,
                allValidatorHashTypes: hashTypes,
                allValidatorIndices: validatorIndices ?? undefined,
                dependsOnOwnHash: validator.$dependsOnOwnHash,
                parameters: parameters,
                isTestnet: isTestnet,
                excludeUserFuncs: excludeUserFuncs
            })

            // this compilation process is potentially very slow, so print messages indicating progress
            console.log(`Compiled validator ${validator.$name}`)

            const optimizedProgram = restoreUplcProgram(
                optimPlutusVersion,
                optimizedCborHex,
                { ir: optimIr, sourceMap: optimSourceMap }
            )

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

            this.addValidatorToCache(validator, optimizedProgram, ownHash)
        }

        /**
         * @param {LoadedValidator} validator
         */
        const buildValidatorAltAndUserFuncs = (validator) => {
            const hashDepHashes = this.getHashDepHashes(
                validator,
                Object.keys(hashTypes)
            )
            const moduleDeps = getModuleDependencies(validator)
            const excludeUserFuncs = new Set(Object.keys(this.cachedUserFuncs))

            const optimizedHash = expectSome(
                this.cachedValidators[validator.$name]
            )
            const optimizedHashHex = optimizedHash.toHex()

            /**
             * @type {UplcProgramV2}
             */
            const optimizedProgram = /** @type {any} */ (optimizedHash.context)
                .program

            // unoptimized compilation (so traces are untouched)
            const {
                cborHex: unoptimizedCborHex,
                plutusVersion: unoptimPlutusVersion,
                ir: unoptimIr,
                sourceMap: unoptimSourceMap
            } = this.lib.compile(
                validator.$sourceCode,
                Array.from(moduleDeps.values()),
                {
                    optimize: false,
                    debug: this.config.debug,
                    hashDependencies: hashDepHashes,
                    allValidatorHashTypes: hashTypes,
                    allValidatorIndices: validatorIndices ?? undefined,
                    // Even though the ownHash is available at this point (taken from the optimized script),
                    //  fetching the ownHash in the optimized script has some logic that can fail, which must be emulated in the unoptimized script.
                    //  Setting dependsOnOwnHash==true, whilst also specifying the ownHash, tells the internal compilation to inject such an emulation
                    dependsOnOwnHash: validator.$dependsOnOwnHash,
                    ownHash: validator.$dependsOnOwnHash
                        ? optimizedHashHex
                        : undefined,
                    parameters: parameters,
                    isTestnet: isTestnet,
                    excludeUserFuncs: excludeUserFuncs,
                    onCompileUserFunc: ({
                        name,
                        cborHex,
                        plutusVersion,
                        ...props
                    }) => {
                        console.log(`Compiled user function ${name}`)
                        const ir = props.ir
                        const sourceMap = props.sourceMap
                        let uplc = restoreUplcProgram(plutusVersion, cborHex, {
                            ...(ir ? { ir: () => ir } : {}),
                            ...(sourceMap ? { sourceMap } : {})
                        })

                        if (props?.alt) {
                            const alt = props.alt
                            const altIr = alt.ir
                            const altSourceMap = alt.sourceMap

                            uplc = uplc.withAlt(
                                /**  @type {any} */ (
                                    restoreUplcProgram(
                                        plutusVersion,
                                        props.alt.cborHex,
                                        {
                                            ...(altIr
                                                ? { ir: () => altIr }
                                                : {}),
                                            ...(altSourceMap
                                                ? { sourceMap: altSourceMap }
                                                : {})
                                        }
                                    )
                                )
                            )
                        }

                        this.cachedUserFuncs[name] = uplc
                    }
                }
            )

            console.log(`Compiled validator ${validator.$name} (unoptimized)`)

            // TODO: with source mapping
            const unoptimizedProgram = restoreUplcProgram(
                unoptimPlutusVersion,
                unoptimizedCborHex,
                { ir: unoptimIr, sourceMap: unoptimSourceMap }
            )

            const completeProgram = optimizedProgram.withAlt(
                /** @type {any} */ (unoptimizedProgram)
            )

            this.addValidatorToCache(
                validator,
                completeProgram,
                optimizedHashHex
            )
        }

        validators.forEach((v) => buildValidator(v))

        validators.forEach((v) => buildValidatorAltAndUserFuncs(v))

        return {
            debug: this.config.debug ?? false,
            validators: this.cachedValidators,
            userFuncs: this.cachedUserFuncs
        }
    }

    /**
     * @private
     * @param {LoadedValidator} validator
     * @param {UplcProgram} program
     * @param {string} hash - although this can be derived from `program`, reuse this to save some effort
     */
    addValidatorToCache(validator, program, hash) {
        const name = validator.$name
        const redeemer = configureCast(validator.$Redeemer, this.config)

        switch (validator.$purpose) {
            case "mixed": // TODO: do we need a separate ValidatorHash type for this?
            case "spending":
                this.cachedValidators[name] = makeValidatorHash(hash, {
                    program,
                    redeemer,
                    datum: configureCast(validator.$Datum, this.config)
                })
                break
            case "minting":
                this.cachedValidators[name] = makeMintingPolicyHash(hash, {
                    program,
                    redeemer
                })
                break
            case "certifying":
            case "rewarding":
            case "staking":
                this.cachedValidators[name] = makeStakingValidatorHash(hash, {
                    program,
                    redeemer
                })
                break
            default:
                throw new Error(
                    `unhandled purpose '${/** @type {any} */ (validator).$purpose}'`
                )
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
                if (v in this.cachedValidators) {
                    hashes[v] = `#${this.cachedValidators[v].toHex()}`
                } else {
                    hashes[v] = "#"
                }
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
     * @returns {Record<string, number> | undefined}
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
                return undefined
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
