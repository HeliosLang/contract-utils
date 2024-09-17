import { expectSome } from "@helios-lang/type-utils"
import { configureCast } from "../cast/Cast.js"
import { loadCompilerLib } from "../compiler/index.js"
import { DagCompiler } from "./DagCompiler.js"
import { contractContextCache } from "./ContractContextCache.js"

/**
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("../cast/index.js").CastConfig} CastConfig
 * @typedef {import("../codegen/LoadedModule.js").LoadedModule} LoadedModule
 * @typedef {import("../codegen/LoadedValidator.js").LoadedValidator} LoadedValidator
 * @typedef {import("../compiler/index.js").CompilerLib} CompilerLib
 */

/**
 * @template {LoadedValidator} V
 * @typedef {import("../codegen/LoadedValidator.js").ExtractDependencies<V>} ExtractDependencies
 */

/**
 * @template {{[name: string]: LoadedValidator}} Vs
 * @template {{[name: string]: LoadedModule}} Ms
 * @typedef {import("./ContractContext.js").ContractContext<Vs, Ms>} ContractContext
 */

/**
 * @typedef {{
 *   isMainnet: boolean
 *   expectedHashes?: {[name: string]: string}
 *   parameters?: Record<string, UplcData>
 *   dumpHashes?: boolean
 *   debug?: boolean
 * }} ContractContextBuildProps
 */

/**
 * @template {{[name: string]: LoadedValidator}} Vs
 * @template {{[name: string]: LoadedModule}} Ms
 */
export class ContractContextBuilder {
    /**
     * @private
     * @readonly
     * @type {Vs}
     */
    validators

    /**
     * @readonly
     * @type {Ms}
     */
    modules

    /**
     * @private
     * @param {Vs} validators
     * @param {Ms} modules
     */
    constructor(validators, modules) {
        this.validators = validators
        this.modules = modules
    }

    /**
     * @returns {ContractContextBuilder<{}, {}>}
     */
    static new() {
        return new ContractContextBuilder({}, {})
    }

    /**
     * @template {LoadedValidator} V
     * @param {V} validator
     * @returns {ContractContextBuilder<
     *   Vs & {[K in V["$name"]]: V},
     *   Ms & ExtractDependencies<V>
     * >}
     */
    with(validator) {
        return new ContractContextBuilder(
            /** @type {any} */ ({
                ...this.validators,
                [validator.$name]: validator
            }),
            /** @type {any} */ ({
                ...this.modules,
                ...Object.fromEntries(
                    validator.$dependencies.map((d) => [d.$name, d])
                )
            })
        )
    }

    /**
     * @template {LoadedModule} M
     * @param {M} m
     * @returns {ContractContextBuilder<
     *   Vs,
     *   Ms & {[K in M["$name"]]: M}
     * >}
     */
    withModule(m) {
        return new ContractContextBuilder(
            this.validators,
            /** @type {any} */ ({
                ...this.modules,
                [m.$name]: m
            })
        )
    }

    /**
     * @param {ContractContextBuildProps} props
     * @returns {ContractContext<Vs, Ms>}
     */
    build(props) {
        const castConfig = { isMainnet: props.isMainnet }
        const lib = loadCompilerLib()

        const dagCompiler = new DagCompiler(lib, {
            debug: props.debug ?? false,
            ...castConfig
        })

        const cached = contractContextCache.shift()

        const compiled =
            cached && cached.debug === props.debug
                ? cached
                : dagCompiler.build(
                      Object.values(this.validators),
                      props.parameters ?? {},
                      !props.isMainnet,
                      props.expectedHashes
                  )

        // TODO: adapt to use generic cache interface
        contractContextCache.push(compiled)

        if (props.dumpHashes) {
            for (let name in compiled.validators) {
                console.log(`${name}: ${compiled.validators[name].toHex()},`)
            }
        }

        /**
         * @type {any}
         */
        const res = {}

        for (let name in this.modules) {
            const mod = this.modules[name]

            res[name] = {
                ...Object.fromEntries(
                    Object.entries(mod.$types).map(([typeName, castLike]) => [
                        typeName,
                        configureCast(castLike, castConfig)
                    ])
                ),
                ...Object.fromEntries(
                    Object.entries(mod.$functions).map(
                        ([funcKey, userFunc]) => [
                            funcKey,
                            userFunc(
                                expectSome(
                                    compiled.userFuncs[`${name}::${funcKey}`]
                                ),
                                castConfig
                            )
                        ]
                    )
                )
            }
        }

        for (let name in this.validators) {
            const validator = this.validators[name]

            res[name] = {
                ...Object.fromEntries(
                    Object.entries(validator.$types).map(
                        ([typeName, castLike]) => [
                            typeName,
                            configureCast(castLike, castConfig)
                        ]
                    )
                ),
                ...Object.fromEntries(
                    Object.entries(validator.$functions).map(
                        ([funcKey, userFunc]) => {
                            if (funcKey == "main") {
                                return [
                                    funcKey,
                                    userFunc(
                                        expectSome(
                                            compiled.validators[name].context
                                                .program
                                        ),
                                        castConfig
                                    )
                                ]
                            } else {
                                return [
                                    funcKey,
                                    userFunc(
                                        expectSome(
                                            compiled.userFuncs[
                                                `${name}::${funcKey}`
                                            ]
                                        ),
                                        castConfig
                                    )
                                ]
                            }
                        }
                    )
                ),
                $hash: compiled.validators[name]
            }
        }

        return res
    }
}
