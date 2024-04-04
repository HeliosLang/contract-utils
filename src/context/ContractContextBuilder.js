import { None } from "@helios-lang/type-utils"
import { loadCompilerLib } from "../compiler/index.js"
import { DagCompiler } from "./DagCompiler.js"

/**
 * @typedef {import("../codegen/LoadedModule.js").LoadedModule} LoadedModule
 * @typedef {import("../codegen/LoadedValidator.js").LoadedValidator} LoadedValidator
 * @typedef {import("../compiler/index.js").CompilerLib} CompilerLib
 */

/**
 * @template {{[name: string]: LoadedValidator}} T
 * @typedef {import("./ContractContext.js").ContractContext<T>} ContractContext
 */

/**
 * @template {{[name: string]: LoadedValidator}} T
 */
export class ContractContextBuilder {
    /**
     * @private
     * @readonly
     * @type {T}
     */
    validators

    /**
     * @private
     * @param {T} validators
     */
    constructor(validators) {
        this.validators = validators
    }

    /**
     * @returns {ContractContextBuilder<{}>}
     */
    static new() {
        return new ContractContextBuilder({})
    }

    /**
     * @template {LoadedValidator} V
     * @param {V} validator
     * @returns {ContractContextBuilder<T & {
     *   [K in V["$name"]]: V
     * }>}
     */
    with(validator) {
        return new ContractContextBuilder({
            ...this.validators,
            [validator.$name]: validator
        })
    }

    /**
     * @param {Option<{[name: string]: string}>} expectedHashes
     * @returns {ContractContext<T>}
     */
    build(expectedHashes = None) {
        const lib = loadCompilerLib()

        const dagCompiler = new DagCompiler(lib)

        return /** @type {any} */ (
            dagCompiler.build(Object.values(this.validators), expectedHashes)
        )
    }
}
