import { expectDefined } from "@helios-lang/type-utils"
import { configureCast } from "../cast/Cast.js"
import { loadCompilerLib } from "../compiler/index.js"
import { DagCompiler } from "./DagCompiler.js"
import { contractContextCache } from "./ContractContextCache.js"

/**
 * @import { UplcData } from "@helios-lang/uplc"
 * @import { CastConfig, CompilerLib, ContractContext, ContractContextBuilder, ContractContextBuilderProps, ExtractDependencies, LoadedModule, LoadedValidator } from "../index.js"
 */

/**
 * @returns {ContractContextBuilder<{}, {}>}
 */
export function makeContractContextBuilder() {
    return new ContractContextBuilderImpl({}, {})
}

/**
 * @template {{[name: string]: LoadedValidator}} Vs
 * @template {{[name: string]: LoadedModule}} Ms
 * @implements {ContractContextBuilder<Vs, Ms>}
 */
class ContractContextBuilderImpl {
    /**
     * @private
     * @readonly
     * @type {Vs}
     */
    validators

    /**
     * @private
     * @readonly
     * @type {Ms}
     */
    modules

    /**
     * @param {Vs} validators
     * @param {Ms} modules
     */
    constructor(validators, modules) {
        this.validators = validators
        this.modules = modules
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
        return /** @type {any} */ (
            new ContractContextBuilderImpl(
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
        return /** @type {any} */ (
            new ContractContextBuilderImpl(
                this.validators,
                /** @type {any} */ ({
                    ...this.modules,
                    [m.$name]: m
                })
            )
        )
    }

    /**
     * @param {ContractContextBuilderProps} props
     * @returns {ContractContext<Vs, Ms>}
     */
    build(props) {
        const castConfig = { isMainnet: props.isMainnet }
        const lib = loadCompilerLib()

        // generate a cache key
        const key = contractContextCache.genCacheKey({
            version: lib.version,
            debug: !!props.debug,
            isMainnet: props.isMainnet,
            validators: this.validators,
            modules: this.modules,
            parameters: props.parameters ?? {}
        })

        const dagCompiler = new DagCompiler(lib, {
            debug: props.debug ?? false,
            ...castConfig
        })

        const cached = contractContextCache.get(key)

        const compiled =
            cached ||
            dagCompiler.build(
                Object.values(this.validators),
                props.parameters ?? {},
                !props.isMainnet,
                props.expectedHashes
            )

        contractContextCache.set(key, compiled)

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
                                expectDefined(
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
                                        expectDefined(
                                            /** @type {any} */ (
                                                compiled.validators[name]
                                            ).context.program
                                        ),
                                        castConfig
                                    )
                                ]
                            } else {
                                return [
                                    funcKey,
                                    userFunc(
                                        expectDefined(
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
