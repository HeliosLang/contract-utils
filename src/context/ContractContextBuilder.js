import { loadCompilerLib } from "../compiler/index.js"
import { DagCompiler } from "./DagCompiler.js"
import { configureCast } from "../cast/Cast.js"
import { contractContextCache } from "./ContractContextCache.js"

/**
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

        const dagCompiler = new DagCompiler(lib, castConfig)

        const cached = contractContextCache.shift()

        const hashes = cached
            ? cached
            : dagCompiler.build(
                  Object.values(this.validators),
                  props.expectedHashes
              )

        contractContextCache.push(hashes)

        /**
         * @type {any}
         */
        const res = {}

        for (let name in this.modules) {
            res[name] = Object.fromEntries(
                Object.entries(this.modules[name].$types).map(
                    ([typeName, castLike]) => [
                        typeName,
                        configureCast(castLike, castConfig)
                    ]
                )
            )
        }

        for (let name in this.validators) {
            res[name] = {
                ...Object.fromEntries(
                    Object.entries(this.validators[name].$types).map(
                        ([typeName, castLike]) => [
                            typeName,
                            configureCast(castLike, castConfig)
                        ]
                    )
                ),
                $hash: hashes[name]
            }
        }

        return res
    }
}
