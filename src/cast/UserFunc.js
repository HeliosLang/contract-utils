export {}

/**
 * @typedef {import("@helios-lang/type-utils").TypeSchema} TypeSchema
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 */

/**
 * @typedef {{
 *   requiresScriptContext: boolean
 *   requiresCurrentScript: boolean
 *   arguments: {
 *     name: string
 *     type: TypeSchema
 *   }[]
 *   returns: TypeSchema
 * }} UserFuncProps
 */

/**
 * @template {((args: Record<string, UplcData>) => UplcData)} T
 */
export class UserFunc {
    /**
     * @readonly
     * @type {UserFuncProps}
     */
    props

    /**
     * @param {UserFuncProps} props
     */
    constructor(props) {
        this.props = props
    }
}
