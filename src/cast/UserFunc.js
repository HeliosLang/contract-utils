/**
 * @typedef {import("@helios-lang/type-utils").TypeSchema} TypeSchema
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("@helios-lang/uplc").UplcProgram} UplcProgram
 */

import { expectSome, isLeft } from "@helios-lang/type-utils"
import { ConstrData, UplcDataValue } from "@helios-lang/uplc"

/**
 * @typedef {{
 *   requiresScriptContext: boolean
 *   requiresCurrentScript: boolean
 *   arguments: {
 *     name: string
 *     type: TypeSchema
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
                const args = this.props.arguments.map(({ name, type }) => {
                    const rawArg = expectSome(namedArgs[name])

                    // TODO: apply type conversion
                    return rawArg
                })

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

                const result = this.uplc.eval(
                    args.map((a) => new UplcDataValue(a))
                ).result

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
