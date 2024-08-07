import { bytesToHex } from "@helios-lang/codec-utils"
import { UplcProgramV2 } from "@helios-lang/uplc"

/**
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("./CompilerLib.js").CompilerLib} CompilerLib
 * @typedef {import("./CompilerLib.js").CompileOptions} CompileOptions
 * @typedef {import("./CompilerLib.js").CompileOutput} CompileOutput
 * @typedef {import("./CompilerLib.js").ScriptHashType} ScriptHashType
 * @typedef {import("./CompilerLib.js").TypeCheckOutput} TypeCheckOutput
 */

/**
 * @typedef {{
 *   name: string
 *   changeParam(key: string, value: UplcData): void
 *   compile(options: {optimize?: boolean, dependsOnOwnHash?: boolean, hashDependencies?: Record<string, string>}): UplcProgramV2
 * }} Program
 */

/**
 * @implements {CompilerLib}
 */
export class CompilerLib_v0_17 {
    /**
     * @private
     * @type {any}
     */
    lib

    /**
     * @param {any} lib
     */
    constructor(lib) {
        this.lib = lib
    }

    /**
     * @type {string}
     */
    get version() {
        return this.lib.VERSION
    }

    /**
     * @param {string} purpose
     * @returns {ScriptHashType}
     */
    getScriptHashType(purpose) {
        const { getScriptHashType } = this.lib

        return getScriptHashType(purpose)
    }

    /**
     * @param {string} mainSource
     * @param {string[]} moduleSources
     * @param {CompileOptions} options
     * @returns {CompileOutput}
     */
    compile(mainSource, moduleSources, options) {
        const { Program } = this.lib

        /**
         * @type {Program}
         */
        const program = new Program(mainSource, {
            moduleSources: moduleSources,
            validatorTypes: options.allValidatorHashTypes,
            isTestnet: options.isTestnet,
            throwCompilerErrors: true
        })

        if (options.parameters) {
            Object.entries(options.parameters).forEach(([key, value]) => {
                program.changeParam(key, value)
            })
        }

        /**
         * @type {UplcProgramV2}
         */
        const uplc = program.compile({
            optimize: options.optimize,
            dependsOnOwnHash: options.dependsOnOwnHash ?? false,
            hashDependencies: {
                ...options.hashDependencies,
                ...(options.ownHash ? { [program.name]: options.ownHash } : {})
            }
        })

        return {
            cborHex: bytesToHex(uplc.toCbor())
        }
    }

    /**
     * @param {string[]} validatorSources
     * @param {string[]} moduleSources
     * @returns {TypeCheckOutput}
     */
    typeCheck(validatorSources, moduleSources) {
        const { analyzeMulti } = this.lib

        return analyzeMulti(validatorSources, moduleSources)
    }
}
