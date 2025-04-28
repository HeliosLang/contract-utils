import { bytesToHex } from "@helios-lang/codec-utils"
import {
    makeUplcApply,
    makeUplcDelay,
    makeUplcForce,
    makeUplcLambda,
    makeUplcSourceMap
} from "@helios-lang/uplc"

/**
 * @import { UplcData, UplcProgramV2, UplcTerm } from "@helios-lang/uplc"
 * @import { CompilerLib, CompileOptions, CompileOutput, ScriptHashType, TypeCheckOutput } from "../index.js"
 */

/**
 * @typedef {{
 *   name: string
 *   currentScriptIndex: number | undefined
 *   changeParam(key: string, value: UplcData): void
 *   compile(options: {
 *     optimize?: boolean,
 *     dependsOnOwnHash?: boolean,
 *     hashDependencies?: Record<string, string>
 *     validatorIndices?: Record<string, number>
 *     excludeUserFuncs?: Set<string>
 *     onCompileUserFunc?: (name: string, uplc: UplcProgramV2) => void
 *   }): UplcProgramV2
 * }} Program
 */

/**
 * @param {any} lib
 * @returns {CompilerLib}
 */
export function makeCompilerLib_v0_17(lib) {
    return new CompilerLib_v0_17(lib)
}

/**
 * @implements {CompilerLib}
 */
class CompilerLib_v0_17 {
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

        const onCompileUserFunc = options.onCompileUserFunc

        /**
         * @type {UplcProgramV2}
         */
        const uplc = program.compile({
            optimize: options.optimize,
            dependsOnOwnHash: options.dependsOnOwnHash ?? false,
            validatorIndices: options.allValidatorIndices,
            hashDependencies: {
                ...options.hashDependencies,
                ...(options.ownHash ? { [program.name]: options.ownHash } : {})
            },
            ...(options.excludeUserFuncs
                ? {
                      excludeUserFuncs: options.excludeUserFuncs
                  }
                : {}),
            ...(onCompileUserFunc
                ? {
                      onCompileUserFunc: (name, uplc) => {
                          const alt = uplc.alt
                          const ir = options.debug ? uplc.ir : undefined
                          const altIr = options.debug ? alt?.ir : undefined
                          const sourceMap = makeUplcSourceMap({
                              term: changeUplcCallTermsToUplcApply(uplc.root)
                          }).toJsonSafe()
                          const altSourceMap = alt
                              ? makeUplcSourceMap({
                                    term: changeUplcCallTermsToUplcApply(
                                        alt.root
                                    )
                                }).toJsonSafe()
                              : undefined

                          onCompileUserFunc({
                              name: name,
                              cborHex: bytesToHex(uplc.toCbor()),
                              plutusVersion: "PlutusScriptV2",
                              sourceMap,
                              ...(ir
                                  ? {
                                        ir
                                    }
                                  : {}),
                              ...(alt
                                  ? {
                                        alt: {
                                            cborHex: bytesToHex(alt.toCbor()),
                                            ...(altIr
                                                ? {
                                                      ir: altIr
                                                  }
                                                : {}),
                                            ...(altSourceMap
                                                ? {
                                                      sourceMap: altSourceMap
                                                  }
                                                : {})
                                        }
                                    }
                                  : {})
                          })
                      }
                  }
                : {})
        })

        const sourceMap = makeUplcSourceMap({
            term: changeUplcCallTermsToUplcApply(uplc.root)
        })

        return {
            cborHex: bytesToHex(uplc.toCbor()),
            plutusVersion: uplc.plutusVersion,
            sourceMap: sourceMap.toJsonSafe(),
            ir: options.debug ? (uplc.ir ?? undefined) : undefined
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

/**
 * @param {UplcTerm} root
 * @returns {UplcTerm}
 */
function changeUplcCallTermsToUplcApply(root) {
    if (
        root.kind == "apply" ||
        root.kind == "builtin" ||
        root.kind == "case" ||
        root.kind == "const" ||
        root.kind == "constr" ||
        root.kind == "error" ||
        root.kind == "var"
    ) {
        return root
    } else if (root.kind == "delay") {
        return makeUplcDelay({
            arg: changeUplcCallTermsToUplcApply(root.arg),
            site: root.site
        })
    } else if (root.kind == "force") {
        return makeUplcForce({
            arg: changeUplcCallTermsToUplcApply(root.arg),
            site: root.site
        })
    } else if (root.kind == "lambda") {
        return makeUplcLambda({
            body: changeUplcCallTermsToUplcApply(root.children[0]),
            site: root.site
        })
    } else {
        const term = /** @type {any} */ (root)
        return makeUplcApply({
            fn: changeUplcCallTermsToUplcApply(term.fn),
            arg: changeUplcCallTermsToUplcApply(term.arg),
            site: term.site
        })
    }
}
