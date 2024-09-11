import { bytesToHex } from "@helios-lang/codec-utils"
import { expectSome, isLeft, isString } from "@helios-lang/type-utils"
import { ConstrData, UplcDataValue } from "@helios-lang/uplc"
import { Cast } from "./Cast.js"


/**
 * @typedef {import("@helios-lang/type-utils").TypeSchema} TypeSchema
 * @typedef {import("@helios-lang/uplc").CekResult} CekResult
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("@helios-lang/uplc").UplcProgram} UplcProgram
 * @typedef {import("@helios-lang/uplc").UplcValue} UplcValue
 * @typedef {import("./Cast.js").CastConfig} CastConfig
 */

/**
 * @typedef {{
 *   name: string
 *   requiresScriptContext: boolean
 *   requiresCurrentScript: boolean
 *   arguments: {
 *     name: string
 *     type: TypeSchema
 *     isOptional: boolean
 *   }[]
 *   returns: TypeSchema
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
     * @param {ArgsT} namedArgs
     * @returns {RetT}
     */
    eval(namedArgs) {
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
            /** @type {UnsafeArgsT<ArgsT>} */ (unsafeNamedArgs)
        )

        return new Cast(this.props.returns, this.props.castConfig).fromUplcData(
            result
        )
    }

    /**
     * @param {UnsafeArgsT<ArgsT>} namedArgs
     * @returns {UplcData}
     */
    evalUnsafe(namedArgs) {
        const result = this.profile(namedArgs).result

        if (isLeft(result)) {
            throw new Error(result.left.error)
        } else if (!isString(result.right) && result.right.kind == "data") {
            return result.right.value
        } else {
            throw new Error(`${result.right.toString()} isn't a UplcDataValue`)
        }
    }

    /**
     * @param {UnsafeArgsT<ArgsT>} namedArgs
     * @returns {CekResult}
     */
    profile(namedArgs) {
        /**
         * @type {UplcData[]}
         */
        const args = this.props.arguments.map(({ name, type, isOptional }) => {
            if (isOptional) {
                if (name in namedArgs && namedArgs[name]) {
                    return new ConstrData(0, [namedArgs[name]])
                } else {
                    return new ConstrData(1, [])
                }
            } else {
                return expectSome(namedArgs[name])
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

        const cekResult = this.uplc.eval(argValues)

        if (this.uplc.alt?.plutusVersion == "PlutusScriptV2") {
            const cekResultUnoptim = this.uplc.alt.eval(argValues)
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
        console.error(result.left.error)
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
