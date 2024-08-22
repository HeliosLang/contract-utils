import { expectSome, isLeft } from "@helios-lang/type-utils"
import { ConstrData, UplcDataValue, UplcProgramV2 } from "@helios-lang/uplc"

/**
 * @typedef {import("@helios-lang/type-utils").TypeSchema} TypeSchema
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("@helios-lang/uplc").UplcProgram} UplcProgram
 * @typedef {import("@helios-lang/uplc").UplcValue} UplcValue
 */

/**
 * @typedef {{
 *   requiresScriptContext: boolean
 *   requiresCurrentScript: boolean
 *   arguments: {
 *     name: string
 *     type: TypeSchema
 *     isOptional: boolean
 *   }[]
 *   returns: TypeSchema
 *   validatorIndices?: Record<string, number>
 * }} UserFuncProps
 */

/**
 * @template T
 */
export class UserFunc {
    /**
     * @private
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
     * @type {T}
     */
    get evalUnsafe() {
        return /** @type {any} */ (
            (namedArgs) => {
                /**
                 * @type {UplcData[]}
                 */
                const args = this.props.arguments.map(
                    ({ name, type, isOptional }) => {
                        if (isOptional) {
                            if (name in namedArgs) {
                                return new ConstrData(0, [namedArgs[name]])
                            } else {
                                return new ConstrData(1, [])
                            }
                        } else {
                            const rawArg = expectSome(namedArgs[name])

                            // TODO: apply type conversion
                            return rawArg
                        }
                    }
                )

                if (this.props.requiresScriptContext) {
                    args.push(expectSome(namedArgs["$scriptContext"]))
                }

                if (this.props.requiresCurrentScript) {
                    const currentScriptName = expectSome(
                        namedArgs["$currentScript"]
                    )

                    const index = expectSome(
                        expectSome(this.props.validatorIndices)[
                            currentScriptName
                        ]
                    )
                    args.push(new ConstrData(index, []))
                }

                const argValues = args.map((a) => new UplcDataValue(a))

                const result = this.uplc.eval(argValues).result

                if (
                    "alt" in this.uplc &&
                    this.uplc.alt instanceof UplcProgramV2
                ) {
                    const resultUnoptim = this.uplc.alt.eval(argValues).result
                    const resultUnoptimStr = evalResultToString(resultUnoptim)
                    const resultStr = evalResultToString(result)

                    if (resultStr != resultUnoptimStr) {
                        throw new Error(
                            `Critical error: contact Helios maintainers, expected ${resultUnoptimStr}, got ${resultStr}`
                        )
                    }
                }

                if (isLeft(result)) {
                    throw new Error(result.left.error)
                } else if (result.right instanceof UplcDataValue) {
                    return result.right.value
                } else {
                    throw new Error(
                        `${result.right.toString()} isn't a UplcDataValue`
                    )
                }
            }
        )
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
        if (typeof result.right == "string") {
            return result.right
        } else if (result.right instanceof UplcDataValue) {
            return result.right.value.toString()
        } else {
            return result.right.toString()
        }
    }
}
