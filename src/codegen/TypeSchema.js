/**
 * @import { TypeSchema } from "@helios-lang/type-utils"
 */

const NONE = "undefined"

/**
 * TODO: handle recursive data structures
 * @param {TypeSchema} schema
 * @returns {[string, string]} - the first entry is the strict canonical type, the second is the permissive type
 */
// XXX * @param {string} [encodingKey] - optional field-name (encoding-key) for map-typed struct fields only
// XXX export function genTypes(schema, encodingKey) {
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
                case "Any": // for backward compat with v0.16.* of the compiler
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
                case "ScriptHash":
                    return ["ScriptHash", "ScriptHash | string | number[]"]
                case "SpendingCredential":
                    return ["SpendingCredential", "SpendingCredential"]
                case "StakingCredential":
                    return ["StakingCredential", "StakingCredential"]
                case "StakingHash":
                    // TODO: implement this
                    return ["never", "never"]
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
                        `TxOutputDatum | ${NONE}`,
                        `TxOutputDatum | ${NONE} | undefined | DatumHash | UplcData`
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
            return [`(${c}) | ${NONE}`, `(${p}) | null | undefined`]
        }
        case "struct": {
            const fieldTypes = schema.fieldTypes.map(
                ({ name, type /* key - not used for type */ }) => ({
                    name: name,
                    // .. the field's definition name is always used, not the encoding key
                    types: genTypes(type)
                })
            )

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
            // similar to a list-typed struct (no encoding keys allowed)
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

/**
 * @param {TypeSchema} schema
 * @returns {Map<string, string>} - key=name, value=from
 */
export function collectBuiltinTypes(schema) {
    /**
     * @type {Map<string, string>}
     */
    const m = new Map()

    collectBuiltinTypesInternal(schema, m)

    return m
}

/**
 * @param {TypeSchema} schema
 * @param {Map<string, string>} m - key=name, value=from
 */
function collectBuiltinTypesInternal(schema, m) {
    const kind = schema.kind

    switch (kind) {
        case "internal":
            const name = schema.name
            switch (name) {
                case "Bool":
                case "ByteArray":
                case "Real":
                case "String":
                    break
                case "AssetClass":
                    m.set("AssetClass", "@helios-lang/ledger")
                    m.set("MintingPolicyHash", "@helios-lang/ledger")
                    break
                case "Any":
                case "Data":
                    m.set("UplcData", "@helios-lang/uplc")
                    break
                case "Int":
                case "Duration":
                case "Ratio":
                    m.set("IntLike", "@helios-lang/codec-utils")
                    break
                case "Time":
                    m.set("TimeLike", "@helios-lang/ledger")
                    break
                case "Address":
                case "MintingPolicyHash":
                case "PubKey":
                case "PubKeyHash":
                case "ScriptHash":
                case "SpendingCredential":
                case "StakingCredential":
                case "StakingValidatorHash":
                case "TimeLike":
                case "TxId":
                case "TxInput":
                case "TxOutput":
                case "TxOutputId":
                case "ValidatorHash":
                    m.set(name, "@helios-lang/ledger")
                    break
                case "StakingHash":
                    // TODO: implement this
                    return ["never", "never"]
                case "TimeRange":
                    m.set("TimeRange", "@helios-lang/ledger")
                    m.set("TimeLike", "@helios-lang/ledger")
                    break
                case "TxOutputDatum":
                    m.set("TxOutputDatum", "@helios-lang/ledger")
                    m.set("DatumHash", "@helios-lang/ledger")
                    m.set("UplcData", "@helios-lang/uplc")
                    break
                case "Value":
                    m.set("Value", "@helios-lang/ledger")
                    m.set("IntLike", "@helios-lang/codec-utils")
                    m.set("MintingPolicyHash", "@helios-lang/ledger")
                    break
                default:
                    throw new Error(`unhandled primitive '${name}' in hl2ts`)
            }
            break
        case "list": {
            collectBuiltinTypesInternal(schema.itemType, m)
            break
        }
        case "map": {
            collectBuiltinTypesInternal(schema.keyType, m)
            collectBuiltinTypesInternal(schema.valueType, m)
            break
        }
        case "tuple": {
            schema.itemTypes.forEach((it) => collectBuiltinTypesInternal(it, m))
            break
        }
        case "option": {
            collectBuiltinTypesInternal(schema.someType, m)
            break
        }
        case "struct": {
            schema.fieldTypes.forEach(({ type }) => {
                collectBuiltinTypesInternal(type, m)
            })
            break
        }
        case "enum": {
            schema.variantTypes.forEach((variant) => {
                collectBuiltinTypesInternal(variant, m)
            })
            break
        }
        case "variant": {
            schema.fieldTypes.forEach(({ type }) => {
                collectBuiltinTypesInternal(type, m)
            })

            break
        }
        case "reference":
            throw new Error("recursive data structures not yet handled")
        default:
            throw new Error(`unhandled TypeSchema kind '${kind}'`)
    }
}
