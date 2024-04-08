/**
 * TODO: references and ids for recursive types and more descriptive codegen
 * TODO: use `kind: "internal" | "list" | "map" | "struct" | "option" | "enum"` instead of `primitiveType` etc.
 * TODO: additional property for struct: `format: "list" | "map"`
 * TODO: rename primitiveType -> internalType
 * @typedef {{
 *     primitiveType: string
 * } | {
 *     listItemType: TypeSchema
 * } | {
 *     mapKeyType: TypeSchema
 *     mapValueType: TypeSchema
 * } | {
 *     optionSomeType: TypeSchema
 * } | {
 *     structFieldTypes: {
 *         name: string
 *         type: TypeSchema
 *     }[]
 * } | {
 *     enumVariantTypes: {
 *          name: string,
 *          fieldTypes: {
 *              name: string
 *              type: TypeSchema
 *          }[]
 *     }[]
 * }} TypeSchema
 */

/**
 * @param {TypeSchema} schema
 * @returns {[string, string]} - the first entry is the canonical type, the second is the permissive type
 */
export function genTypes(schema) {
    if ("primitiveType" in schema) {
        switch (schema.primitiveType) {
            case "Address":
                return ["Address", "Address | string"]
            case "Any":
                return ["never", "any"]
            case "AssetClass":
                return [
                    "AssetClass",
                    "AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {mph: MintingPolicyHash | string | number[], tokenName: string | number[]}"
                ]
            case "Bool":
                return ["boolean", "boolean"]
            case "ByteArray":
                return ["number[]", "number[]"]
            case "SpendingCredential":
                return [
                    "SpendingCredential",
                    "SpendingCredential | PubKeyHash | ValidatorHash"
                ]
            case "Data":
                return ["UplcData", "UplcData"]
            case "Duration":
                return ["bigint", "bigint | number"]
            case "Int":
                return ["bigint", "bigint | number | string"]
            case "MintingPolicyHash":
                return [
                    "MintingPolicyHash",
                    "MintingPolicyHash | string | number[]"
                ]
            case "PubKey":
                return ["PubKey", "PubKey | string | number[]"]
            case "PubKeyHash":
                return ["PubKeyHash", "PubKeyHash | string | number[]"]
            case "Real":
                return ["number", "number"]
            case "StakingCredential":
                return [
                    "StakingCredential",
                    "StakingCredential | StakingHash | PubKeyHash | StakingValidatorHash"
                ]
            case "StakingHash":
                return [
                    "StakingHash",
                    "StakingHash | PubKeyHash | StakingValidatorHash"
                ]
            case "StakingValidatorHash":
                return [
                    "StakingValidatorHash",
                    "StakingValidatorHash | string | number[]"
                ]
            case "String":
                return ["string", "string"]
            case "Time":
                return ["Date", "Date | bigint | number"]
            case "TimeRange":
                return [
                    "TimeRange",
                    "TimeRange | [Date | number | bigint, Date | number | bigint] | {start?: Date | number | bigint, excludeStart?: boolean, end?: Date | number | bigint, excludeEnd?: boolean}"
                ]
            case "TxId":
                return ["TxId", "TxId | string | number[]"]
            case "TxOutputDatum":
                return [
                    "TxOutputDatum | null",
                    "TxOutputDatum | null | undefined | DatumHash | UplcData"
                ]
            case "TxOutputId":
                return ["TxOutputId", "TxOutputId | string"]
            case "ValidatorHash":
                return ["ValidatorHash", "ValidatorHash | string | number[]"]
            case "Value":
                return [
                    "Value",
                    "Value | [MintingPolicyHash | string | number[], [number[] | string, bigint | number | string][]][] | {mph: MintingPolicyHash | string | number[], tokens: {name: number[] | string, qty: bigint | number | string}[]}[]"
                ]
            default:
                throw new Error(
                    `unhandled primitive ${schema.primitiveType} in hl2ts`
                )
        }
    } else if ("listItemType" in schema) {
        const [c, p] = genTypes(schema.listItemType)
        return [`(${c})[]`, `(${p})[]`]
    } else if ("optionSomeType" in schema) {
        const [c, p] = genTypes(schema.optionSomeType)
        return [`(${c}) | null`, `(${p}) | null | undefined`]
    } else if ("mapKeyType" in schema) {
        const [ck, pk] = genTypes(schema.mapKeyType)
        const [cv, pv] = genTypes(schema.mapValueType)

        return [`Map<${ck}, ${cv}>`, `Map<${pk}, ${pv}> | [${pk}, ${pv}][]`]
    } else if ("structFieldTypes" in schema) {
        const fieldTypes = schema.structFieldTypes.map(({ name, type }) => ({
            name: name,
            types: genTypes(type)
        }))

        return [
            `{${fieldTypes.map(({ name, types: [c, p] }) => `${name}: ${c}`).join(", ")}}`,
            `{${fieldTypes.map(({ name, types: [c, p] }) => `${name}: ${p}`).join(", ")}}`
        ]
    } else if ("enumVariantTypes" in schema) {
        const variantTypes = schema.enumVariantTypes.map(
            ({ name, fieldTypes }) => ({
                name: name,
                types: genTypes({ structFieldTypes: fieldTypes })
            })
        )

        return [
            variantTypes
                .map(({ name, types: [c, p] }) => `{${name}: ${c}}`)
                .join(" | "),
            variantTypes
                .map(({ name, types: [c, p] }) => `{${name}: ${p}}`)
                .join(" | ")
        ]
    } else {
        throw new Error(`unhandled TypeSchema ${JSON.stringify(schema)}`)
    }
}
