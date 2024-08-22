/**
 * @typedef {import("@helios-lang/type-utils").TypeSchema} TypeSchema
 */

/**
 * TODO: handle recursive data structures
 * @param {TypeSchema} schema
 * @returns {[string, string]} - the first entry is the strict canonical type, the second is the permissive type
 */
export function genTypes(schema) {
    const kind = schema.kind

    switch (kind) {
        case "internal":
            const name = schema.name
            switch (name) {
                case "Address":
                    return ["Address", "Address | string"]
                case "AssetClass":
                    return [
                        "AssetClass",
                        "AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {mph: MintingPolicyHash | string | number[], tokenName: string | number[]}"
                    ]
                case "Bool":
                    return ["boolean", "boolean"]
                case "ByteArray":
                    return ["number[]", "number[]"]
                case "Data":
                    return ["UplcData", "UplcData"]
                case "Duration":
                    return ["bigint", "IntLike"]
                case "Int":
                    return ["bigint", "IntLike"]
                case "MintingPolicyHash":
                    return [
                        "MintingPolicyHash",
                        "MintingPolicyHash | string | number[]"
                    ]
                case "PubKey":
                    return ["PubKey", "PubKey | string | number[]"]
                case "PubKeyHash":
                    return ["PubKeyHash", "PubKeyHash | string | number[]"]
                case "Ratio":
                    return ["[bigint, bigint]", "[IntLike, IntLike]"]
                case "Real":
                    return ["number", "number"]
                case "SpendingCredential":
                    return [
                        "SpendingCredential",
                        "SpendingCredential | PubKeyHash | ValidatorHash"
                    ]
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
                    return ["number", "TimeLike"]
                case "TimeRange":
                    return [
                        "TimeRange",
                        "TimeRange | [TimeLike, TimeLike] | {start?: TimeLike, excludeStart?: boolean, end?: TimeLike, excludeEnd?: boolean}"
                    ]
                case "TxId":
                    return ["TxId", "TxId | string | number[]"]
                case "TxInput":
                    return ["TxInput", "TxInput"]
                case "TxOutput":
                    return ["TxOutput", "TxOutput"]
                case "TxOutputDatum":
                    return [
                        "TxOutputDatum | null",
                        "TxOutputDatum | null | undefined | DatumHash | UplcData"
                    ]
                case "TxOutputId":
                    return ["TxOutputId", "TxOutputId | string"]
                case "ValidatorHash":
                    return [
                        "ValidatorHash",
                        "ValidatorHash | string | number[]"
                    ]
                case "Value":
                    return [
                        "Value",
                        "Value | [MintingPolicyHash | string | number[], [number[] | string, IntLike][]][] | {mph: MintingPolicyHash | string | number[], tokens: {name: number[] | string, qty: IntLike}[]}[]"
                    ]
                default:
                    throw new Error(`unhandled primitive '${name}' in hl2ts`)
            }
        case "list": {
            const [c, p] = genTypes(schema.itemType)
            return [`(${c})[]`, `(${p})[]`]
        }
        case "map": {
            const [ck, pk] = genTypes(schema.keyType)
            const [cv, pv] = genTypes(schema.valueType)

            return [`Map<${ck}, ${cv}>`, `Map<${pk}, ${pv}> | [${pk}, ${pv}][]`]
        }
        case "tuple": {
            const itemTypes = schema.itemTypes.map((it) => genTypes(it))

            return [
                `[${itemTypes.map((it) => it[0]).join(", ")}]`,
                `[${itemTypes.map((it) => it[1]).join(", ")}]`
            ]
        }
        case "option": {
            const [c, p] = genTypes(schema.someType)
            return [`(${c}) | null`, `(${p}) | null | undefined`]
        }
        case "struct": {
            const fieldTypes = schema.fieldTypes.map(({ name, type }) => ({
                name: name,
                types: genTypes(type)
            }))

            return [
                `{${fieldTypes.map(({ name, types: [c, p] }) => `${name}: ${c}`).join(", ")}}`,
                `{${fieldTypes.map(({ name, types: [c, p] }) => `${name}: ${p}`).join(", ")}}`
            ]
        }
        case "enum": {
            const variantTypes = schema.variantTypes.map((variant) => ({
                name: variant.name,
                types: genTypes(variant)
            }))

            return [
                variantTypes
                    .map(({ name, types: [c, p] }) => `{${name}: ${c}}`)
                    .join(" | "),
                variantTypes
                    .map(({ name, types: [c, p] }) => `{${name}: ${p}}`)
                    .join(" | ")
            ]
        }
        case "variant": {
            // similar to structure
            const fieldTypes = schema.fieldTypes.map(({ name, type }) => ({
                name: name,
                types: genTypes(type)
            }))

            return [
                `{${fieldTypes.map(({ name, types: [c, p] }) => `${name}: ${c}`).join(", ")}}`,
                `{${fieldTypes.map(({ name, types: [c, p] }) => `${name}: ${p}`).join(", ")}}`
            ]
        }
        case "reference":
            throw new Error("recursive data structures not yet handled")
        default:
            throw new Error(`unhandled TypeSchema kind '${kind}'`)
    }
}
