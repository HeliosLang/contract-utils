import { bytesToHex } from "@helios-lang/codec-utils"
import { expectSome, isLeft, isString, None } from "@helios-lang/type-utils"
import { ConstrData, UplcDataValue, UplcRuntimeError } from "@helios-lang/uplc"
import { Cast } from "./Cast.js"

/**
 * @typedef {import("@helios-lang/type-utils").TypeSchema} TypeSchema
 * @typedef {import("@helios-lang/uplc").CekResult} CekResult
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("@helios-lang/uplc").UplcLoggingI} UplcLoggingI
 * @typedef {import("@helios-lang/uplc").UplcProgram} UplcProgram
 * @typedef {import("@helios-lang/uplc").UplcValue} UplcValue
 * @typedef {import("./Cast.js").CastConfig} CastConfig
 */

/**
 * TODO: add logOptions here as well (which can be overridden by logOptions passed directly to eval(), evalUnsafe() and profile())?
 * `returns` is optional to accomodate main functions that return void
 * @typedef {{
 *   name: string
 *   requiresScriptContext: boolean
 *   requiresCurrentScript: boolean
 *   arguments: {
 *     name: string
 *     type: TypeSchema
 *     isOptional: boolean
 *   }[]
 *   returns?: TypeSchema
 *   validatorIndices?: Record<string, number>
 *   castConfig: CastConfig
 * }} UserFuncProps
 */

/**
 * @template ArgsT
 * @typedef {{[K in keyof ArgsT]: K extends "$currentScript" ? string : UplcData}} UnsafeArgsT
 */

/**
 * @template {{[argName: string]: any}} ArgsT
 * @template RetT
 */
export class UserFunc {
    /**
     * @readonly
     * @type {UplcProgram}
     */
    uplc

    /**
     * @private
     * @readonly
     * @type {UserFuncProps}
     */
    props

    /**
     * @param {UplcProgram} uplc
     * @param {UserFuncProps} props
     */
    constructor(uplc, props) {
        this.uplc = uplc
        this.props = props
    }

    /**
     * @type {string}
     */
    get name() {
        return this.props.name
    }

    /**
     * @param {ArgsT} namedArgs
     * @param {Option<UplcLoggingI>} logOptions
     * @returns {RetT}
     */
    eval(namedArgs, logOptions = None) {
        /**
         * @type {{[argName: string]: any}}
         */
        const unsafeNamedArgs = {}

        Object.entries(namedArgs).forEach(([argName, argValue]) => {
            const argDetails = this.props.arguments.find(
                (a) => a.name == argName
            )

            if (argDetails) {
                const typeSchema = argDetails.type

                unsafeNamedArgs[argName] = new Cast(
                    typeSchema,
                    this.props.castConfig
                ).toUplcData(argValue)
            } else if (["$currentScript", "$scriptContext"].includes(argName)) {
                unsafeNamedArgs[argName] = argValue
            } else {
                console.error(
                    `invalid arg '${argName}' for user function ${this.props.name}`
                )
            }
        })

        const result = this.evalUnsafe(
            /** @type {UnsafeArgsT<ArgsT>} */ (unsafeNamedArgs),
            logOptions
        )

        if (this.props.returns) {
            return new Cast(
                this.props.returns,
                this.props.castConfig
            ).fromUplcData(expectSome(/** @type {any} */ (result)))
        } else {
            return /** @type {any} */ (undefined)
        }
    }

    /**
     * @param {UnsafeArgsT<ArgsT>} namedArgs
     * @param {Option<UplcLoggingI>} logOptions
     * @returns {RetT extends void ? void : UplcData}
     */
    evalUnsafe(namedArgs, logOptions = None) {
        const result = this.profile(namedArgs, logOptions).result

        if (isLeft(result)) {
            throw new UplcRuntimeError(result.left.error, result.left.callSites)
        } else if (!isString(result.right) && result.right.kind == "data") {
            return /** @type {any} */ (result.right.value)
        } else if (this.props.returns) {
            throw new Error(`${result.right.toString()} isn't a UplcDataValue`)
        } else {
            return /** @type {any} */ (undefined)
        }
    }

    /**
     * @param {UnsafeArgsT<ArgsT>} namedArgs
     * @param {Option<UplcLoggingI>} logOptions - optional, passed to UplcProgram.eval if provided
     * @returns {CekResult}
     */
    profile(namedArgs, logOptions = None) {
        const isMain = this.name == "main"

        /**
         * @type {UplcData[]}
         */
        const args = []

        this.props.arguments.forEach(({ name, type, isOptional }) => {
            if (isMain) {
                if (isOptional) {
                    // used for $datum in mixed script
                    if (name in namedArgs && namedArgs[name]) {
                        args.push(namedArgs[name])
                    }
                } else {
                    args.push(expectSome(namedArgs[name]))
                }
            } else {
                if (isOptional) {
                    if (name in namedArgs && namedArgs[name]) {
                        args.push(new ConstrData(0, [namedArgs[name]]))
                    } else {
                        args.push(new ConstrData(1, []))
                    }
                } else {
                    args.push(expectSome(namedArgs[name]))
                }
            }
        })

        if (this.props.requiresScriptContext) {
            args.push(expectSome(namedArgs["$scriptContext"]))
        }

        if (this.props.requiresCurrentScript) {
            const currentScriptName = expectSome(
                /** @type {any} */ (namedArgs)["$currentScript"]
            )

            const index = expectSome(
                expectSome(this.props.validatorIndices)[currentScriptName]
            )

            args.push(new ConstrData(index, []))
        }

        const argValues = args.map((a) => new UplcDataValue(a))

        const cekResult = this.uplc.eval(argValues, {
            logOptions: logOptions ?? undefined
        })

        if (this.uplc.alt?.plutusVersion == "PlutusScriptV2") {
            const cekResultUnoptim = this.uplc.alt.eval(argValues, {
                logOptions: logOptions ?? undefined
            })
            const resultUnoptim = cekResultUnoptim.result
            const resultUnoptimStr = evalResultToString(resultUnoptim)
            const resultStr = evalResultToString(cekResult.result)

            if (resultStr != resultUnoptimStr) {
                console.error(
                    `## Unoptimized IR:\n${this.uplc.alt.ir ?? "not available"}`
                )

                args.forEach((a, i) => {
                    console.error(`## Arg ${i}: ${bytesToHex(a.toCbor())}`)
                })

                throw new Error(
                    `Critical error: expected ${resultUnoptimStr}, but got ${resultStr}. Contact Helios maintainers and share this console output`
                )
            }

            // also make sure the cost is an improvement
            if (cekResult.cost.mem > cekResultUnoptim.cost.mem) {
                throw new Error(
                    `Critical error: optimizer worsened memory cost of ${this.props.name}`
                )
            }

            if (cekResult.cost.cpu > cekResultUnoptim.cost.cpu) {
                throw new Error(
                    `Critical error: optimizer worsened cpu cost of ${this.props.name}`
                )
            }

            if (
                cekResult.cost.mem == cekResultUnoptim.cost.mem &&
                cekResult.cost.cpu == cekResultUnoptim.cost.cpu
            ) {
                console.error(
                    `Warning: optimizer didn't improve cost of ${this.props.name}`
                )
            }

            // overwrite the optimized cekResult.result with the unoptimized result because it contains more information
            cekResult.result = resultUnoptim
        }

        return cekResult
    }
}

/**
 * @param {Either<{error: string}, string | UplcValue>} result
 * @returns {string}
 */
function evalResultToString(result) {
    if (isLeft(result)) {
        return "error"
    } else {
        if (isString(result.right)) {
            return result.right
        } else if (result.right.kind == "data") {
            return result.right.value.toString()
        } else {
            return result.right.toString()
        }
    }
}
