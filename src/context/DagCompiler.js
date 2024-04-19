import { bytesToHex } from "@helios-lang/codec-utils"
import {
    MintingPolicyHash,
    StakingValidatorHash,
    ValidatorHash
} from "@helios-lang/ledger"
import { None } from "@helios-lang/type-utils"
import { UplcProgramV2 } from "@helios-lang/uplc"
import { configureCast } from "../cast/index.js"

/**
 * @typedef {import("../cast/index.js").CastConfig} CastConfig
 * @typedef {import("../codegen/LoadedValidator.js").LoadedValidator} LoadedValidator
 * @typedef {import("../compiler/index.js").CompilerLib} CompilerLib
 * @typedef {import("./ContractContext.js").AnyContractValidatorContext} AnyContractValidatorContext
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
    cache

    /**
     * @param {CompilerLib} lib
     * @param {CastConfig} castConfig
     */
    constructor(lib, castConfig) {
        this.lib = lib
        this.castConfig = castConfig
        this.cache = {}
    }

    /**
     * @param {LoadedValidator[]} validators
     * @param {Option<{[name: string]: string}>} expectedHashes
     * @returns {{[name: string]: AnyContractValidatorContext}}
     */
    build(validators, expectedHashes = None) {
        const hashTypes = this.getHashTypes(validators)

        /**
         * `buildValidator()` is a closure instead of a member method of DagCompiler
         *    because this way we have easy access to `hashTypes` and `expectedHashes`
         * @param {LoadedValidator} validator
         */
        const buildValidator = (validator) => {
            const name = validator.$name
            const sourceCode = validator.$sourceCode

            // if already built before, return immediately
            if (name in this.cache) {
                return
            }

            // make sure all the hash dependencies are built first
            validator.$hashDependencies.forEach((v) => buildValidator(v))

            // get the dependencies
            const hashDeps = this.getHashDependencies(validator)
            const moduleDeps = getModuleDependencies(validator)

            // optimized compilation
            const { cborHex: optimizedCborHex, prettyIR } = this.lib.compile(
                sourceCode,
                moduleDeps,
                {
                    optimize: true,
                    hashDependencies: hashDeps,
                    allValidatorHashTypes: hashTypes,
                    dependsOnOwnHash: validator.$dependsOnOwnHash
                }
            )

            const optimizedProgram = UplcProgramV2.fromCbor(optimizedCborHex)

            // calculate the hash
            const ownHash = bytesToHex(optimizedProgram.hash())

            // optionally assert the own hash is equal to a given hash
            if (expectedHashes && name in expectedHashes) {
                if (expectedHashes[name] != ownHash) {
                    console.log(prettyIR)

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
                    hashDependencies: hashDeps,
                    allValidatorHashTypes: hashTypes,
                    ownHash: validator.$dependsOnOwnHash ? ownHash : undefined
                }
            )

            const unoptimizedProgram =
                UplcProgramV2.fromCbor(unoptimizedCborHex)

            // add result to cache (unoptimizedProgram is attached to optimizedProgram)
            this.addToCache(
                validator,
                optimizedProgram.withAlt(unoptimizedProgram),
                ownHash
            )
        }

        validators.forEach((v) => buildValidator(v))

        return this.cache
    }

    /**
     * @private
     * @param {LoadedValidator} validator
     * @param {UplcProgramV2} program
     * @param {string} hash - although this can be derived from `program`, reuse this to save some effort
     */
    addToCache(validator, program, hash) {
        const name = validator.$name
        const redeemer = configureCast(validator.$Redeemer, this.castConfig)

        switch (validator.$purpose) {
            case "spending":
                this.cache[name] = new ValidatorHash(hash, {
                    program,
                    redeemer,
                    datum: configureCast(validator.$Datum, this.castConfig)
                })
                break
            case "minting":
                this.cache[name] = new MintingPolicyHash(hash, {
                    program,
                    redeemer
                })
                break
            case "certifying":
            case "rewarding":
            case "staking":
                this.cache[name] = new StakingValidatorHash(hash, {
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
     * @returns {{[name: string]: string}} - TODO: do we really need the purpose?
     */
    getHashDependencies(validator) {
        /**
         * @type {{[name: string]: string}}
         */
        const deps = {}

        validator.$hashDependencies.forEach((dep) => {
            const k = dep.$name
            const v = this.cache[k]

            if (!v) {
                throw new Error(
                    `${k} should've been built before ${validator.$name}`
                )
            }

            deps[k] = v.toHex()
        })

        return deps
    }

    /**
     * @private
     * @param {LoadedValidator[]} validators
     * @returns {{[name: string]: any}}
     */
    getHashTypes(validators) {
        return Object.fromEntries(
            validators.map((v) => {
                return [v.$name, this.lib.getScriptHashType(v.$purpose)]
            })
        )
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
