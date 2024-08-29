import { decodeUtf8, encodeUtf8 } from "@helios-lang/codec-utils"
import {
    Address,
    AssetClass,
    DatumHash,
    MintingPolicyHash,
    PubKeyHash,
    ScriptHash,
    SpendingCredential,
    StakingCredential,
    StakingHash,
    StakingValidatorHash,
    TimeRange,
    TxId,
    TxInput,
    TxOutput,
    TxOutputDatum,
    TxOutputId,
    ValidatorHash,
    Value
} from "@helios-lang/ledger"
import { None, expectSome } from "@helios-lang/type-utils"
import {
    ByteArrayData,
    ConstrData,
    IntData,
    ListData,
    MapData,
    decodeBoolData,
    decodeOptionData,
    decodeRealData,
    encodeBoolData,
    encodeOptionData,
    encodeRealData
} from "@helios-lang/uplc"

/**
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("../codegen/index.js").TypeSchema} TypeSchema
 */

/**
 * @typedef {{
 *   isMainnet: boolean
 * }} CastConfig
 */

/**
 * @template TStrict
 * @template TPermissive
 * @typedef {(config: CastConfig) => Cast<TStrict, TPermissive>} ConfigurableCast
 */

/**
 * StrictType and PermissiveType work for both Cast and ConfigurableCast
 * @template TStrict
 * @template TPermissive
 * @typedef {Cast<TStrict, TPermissive> | ConfigurableCast<TStrict, TPermissive>} CastLike
 */

/**
 * @template TStrict
 * @template TPermissive
 */
export class Cast {
    /**
     * @readonly
     * @type {TypeSchema}
     */
    schema

    /**
     * @readonly
     * @type {CastConfig}
     */
    config

    /**
     * @param {TypeSchema} schema
     * @param {CastConfig} config
     */
    constructor(schema, config) {
        this.schema = schema
        this.config = config
    }

    /**
     * @param {UplcData} data
     * @returns {TStrict}
     */
    fromUplcData(data) {
        return uplcToSchema(this.schema, data, this.config)
    }

    /**
     * @param {TPermissive} x
     * @returns {UplcData}
     */
    toUplcData(x) {
        return schemaToUplc(this.schema, x)
    }
}

/**
 * @param {TypeSchema} schema
 * @param {any} x
 * @param {Record<string, TypeSchema>} defs
 * @returns {UplcData}
 */
function schemaToUplc(schema, x, defs = {}) {
    const kind = schema.kind

    switch (kind) {
        case "reference": {
            const def = expectSome(defs[schema.id])
            return schemaToUplc(def, x, defs)
        }
        case "internal": {
            const name = schema.name

            switch (name) {
                case "Address":
                    return Address.new(x).toUplcData()
                case "Any":
                    return new IntData(0n)
                case "AssetClass":
                    return AssetClass.new(x).toUplcData()
                case "Bool":
                    return encodeBoolData(x)
                case "ByteArray":
                    return new ByteArrayData(x)
                case "Credential":
                case "SpendingCredential":
                    return SpendingCredential.new(x).toUplcData()
                case "Data":
                    return x
                case "DatumHash":
                    return DatumHash.new(x).toUplcData()
                case "DCert":
                    return x.toUplcData()
                case "Duration":
                case "Int":
                    return new IntData(x)
                case "MintingPolicyHash":
                    return MintingPolicyHash.new(x).toUplcData()
                case "PubKeyHash":
                    return PubKeyHash.new(x).toUplcData()
                case "Real":
                    return encodeRealData(x)
                case "Ratio":
                    return new ListData([new IntData(x[0]), new IntData(x[1])])
                case "ScriptHash":
                    return ScriptHash.new(x).toUplcData()
                case "StakingCredential":
                    return StakingCredential.new(x).toUplcData()
                case "StakingHash":
                    return StakingHash.new(x).toUplcData()
                case "StakingValidatorHash":
                    return StakingValidatorHash.new(x).toUplcData()
                case "String":
                    return new ByteArrayData(encodeUtf8(x))
                case "Time":
                    return new IntData(x)
                case "TimeRange":
                    return TimeRange.new(x).toUplcData()
                case "TxId":
                    return TxId.new(x).toUplcData()
                case "TxInput":
                    return /** @type {TxInput} */ (x).toUplcData()
                case "TxOutput":
                    return /** @type {TxOutput} */ (x).toUplcData()
                case "TxOutputDatum":
                    return x
                        ? TxOutputDatum.new(x)?.toUplcData() ??
                              new ConstrData(0, [])
                        : new ConstrData(0, [])
                case "TxOutputId":
                    return TxOutputId.new(x).toUplcData()
                case "ValidatorHash":
                    return ValidatorHash.new(x).toUplcData()
                case "Value":
                    return Value.new(x).toUplcData()
                default:
                    throw new Error(`not yet implemented for ${name}`)
            }
        }
        case "list":
            return new ListData(
                x.map((x) => schemaToUplc(schema.itemType, x, defs))
            )
        case "map": {
            const entries = x instanceof Map ? x.entries() : x
            return new MapData(
                entries.map(([k, v]) => [
                    schemaToUplc(schema.keyType, k, defs),
                    schemaToUplc(schema.valueType, v, defs)
                ])
            )
        }
        case "tuple":
            return new ListData(
                x.map((x, i) => schemaToUplc(schema.itemTypes[i], x, defs))
            )
        case "option":
            return encodeOptionData(
                x ? schemaToUplc(schema.someType, x, defs) : None
            )
        case "struct": {
            defs[schema.id] = schema
            switch (schema.format) {
                case "singleton":
                    return schemaToUplc(
                        schema.fieldTypes[0].type,
                        x[schema.fieldTypes[0].name],
                        defs
                    )
                case "list":
                    return new ListData(
                        schema.fieldTypes.map(({ name, type }) =>
                            schemaToUplc(type, x[name])
                        )
                    )
                case "map":
                    return new MapData(
                        schema.fieldTypes.map(({ name, type }) => [
                            new ByteArrayData(encodeUtf8(name)),
                            schemaToUplc(type, x[name], defs)
                        ])
                    )
                default:
                    throw new Error(
                        `unhandled struct format '${schema.format}'`
                    )
            }
        }
        case "enum": {
            defs[schema.id] = schema
            const variantName = Object.keys(x)[0]
            const variantFields = Object.values(x)[0]
            const tag = schema.variantTypes.findIndex(
                (v) => v.name == variantName
            )

            if (tag == -1) {
                throw new Error(
                    `invalid variant ${variantName} (expected: ${schema.variantTypes.map((v) => v.name).join(", ")})`
                )
            }

            return new ConstrData(
                tag,
                schema.variantTypes[tag].fieldTypes.map((f) =>
                    schemaToUplc(f.type, variantFields[f.name], defs)
                )
            )
        }
        case "variant":
            defs[schema.id] = schema
            return new ConstrData(
                schema.tag,
                schema.fieldTypes.map(({ name, type }) =>
                    schemaToUplc(type, x[name])
                )
            )
        default:
            throw new Error(`unhandled schema kind '${kind}'`)
    }
}

/**
 * This should fail when deviating
 * @param {TypeSchema} schema
 * @param {UplcData} data
 * @param {CastConfig} config
 * @param {Record<string, TypeSchema>} defs
 * @returns {any}
 */
function uplcToSchema(schema, data, config, defs = {}) {
    const kind = schema.kind

    switch (kind) {
        case "internal": {
            const name = schema.name

            switch (name) {
                case "Address":
                    return Address.fromUplcData(config.isMainnet, data)
                case "Any":
                    // TODO: should this throw an error?
                    return null
                case "AssetClass":
                    return AssetClass.fromUplcData(data)
                case "Bool":
                    return decodeBoolData(data, true)
                case "ByteArray":
                    return ByteArrayData.expect(data).bytes
                case "SpendingCredential":
                case "Credential":
                    return SpendingCredential.fromUplcData(data)
                case "Data":
                    return data
                case "DCert":
                    throw new Error(
                        "can't convert UplcData back into DCert (significant loss of information)"
                    )
                case "Duration":
                case "Int":
                    return IntData.expect(data).value
                case "MintingPolicyHash":
                    return MintingPolicyHash.fromUplcData(data)
                case "PubKeyHash":
                    return PubKeyHash.fromUplcData(data)
                case "Ratio": {
                    const [top, bottom] = ListData.expect(data).items
                    return [
                        IntData.expect(top).value,
                        IntData.expect(bottom).value
                    ]
                }
                case "Real":
                    return decodeRealData(data)
                case "ScriptHash":
                    return ScriptHash.fromUplcData(data)
                case "StakingCredential":
                    return StakingCredential.fromUplcData(data)
                case "StakingHash":
                    return StakingHash.fromUplcData(data)
                case "StakingValidatorHash":
                    return StakingValidatorHash.fromUplcData(data)
                case "String":
                    return decodeUtf8(ByteArrayData.expect(data).bytes)
                case "Time":
                    return Number(IntData.expect(data).value) // a number has enough precision to represent ms since 1970 for another 142000 years
                case "TimeRange":
                    return TimeRange.fromUplcData(data)
                case "TxId":
                    return TxId.fromUplcData(data)
                case "TxInput":
                    return TxInput.fromUplcData(config.isMainnet, data)
                case "TxOutput":
                    return TxOutput.fromUplcData(config.isMainnet, data)
                case "TxOutputId":
                    return TxOutputId.fromUplcData(data)
                case "ValidatorHash":
                    return ValidatorHash.fromUplcData(data)
                case "Value":
                    return Value.fromUplcData(data)
                default:
                    throw new Error(`not yet implemented for ${name}`)
            }
        }
        case "list":
            return ListData.expect(data).items.map((x) =>
                uplcToSchema(schema.itemType, x, config, defs)
            )
        case "map":
            return new Map(
                MapData.expect(data).items.map(([k, v]) => [
                    uplcToSchema(schema.keyType, k, config, defs),
                    uplcToSchema(schema.valueType, v, config, defs)
                ])
            )
        case "tuple":
            return ListData.expect(data).items.map((x, i) =>
                uplcToSchema(schema.itemTypes[i], x, config, defs)
            )
        case "option": {
            const optionData = decodeOptionData(data)
            return optionData
                ? uplcToSchema(schema.someType, optionData, config, defs)
                : None
        }
        case "struct": {
            defs[schema.id] = schema
            switch (schema.format) {
                case "singleton":
                    return {
                        [schema.fieldTypes[0].name]: uplcToSchema(
                            schema.fieldTypes[0].type,
                            data,
                            config,
                            defs
                        )
                    }
                case "list": {
                    const fields = ListData.expect(data).items

                    if (fields.length != schema.fieldTypes.length) {
                        throw new Error(
                            `expected ${schema.fieldTypes.length} fields in struct, got ${fields.length} fields`
                        )
                    }

                    return Object.fromEntries(
                        fields.map((field, i) => [
                            schema.fieldTypes[i].name,
                            uplcToSchema(
                                schema.fieldTypes[i].type,
                                field,
                                config,
                                defs
                            )
                        ])
                    )
                }
                case "map": {
                    const entries = MapData.expect(data).items

                    if (entries.length != schema.fieldTypes.length) {
                        throw new Error(
                            `expected ${schema.fieldTypes.length} fields in struct, got ${entries.length} fields`
                        )
                    }

                    return new Map(
                        schema.fieldTypes.map(({ name, type }) => {
                            const pair = expectSome(
                                entries.find(
                                    ([key, _]) =>
                                        decodeUtf8(
                                            ByteArrayData.expect(key).bytes
                                        ) == name
                                )
                            )

                            return [
                                name,
                                uplcToSchema(type, pair[1], config, defs)
                            ]
                        })
                    )
                }
                default:
                    throw new Error(
                        `unhandled struct format '${schema.format}'`
                    )
            }
        }
        case "enum": {
            defs[schema.id] = schema
            const { tag, fields } = ConstrData.expect(data)

            const variantSchema = schema.variantTypes[tag]

            if (!variantSchema) {
                throw new Error(`tag ${tag} out of range`)
            }

            const nExpected = variantSchema.fieldTypes.length

            if (fields.length != nExpected) {
                throw new Error(
                    `expected ${nExpected} fields for variant ${variantSchema.name} (tag ${tag}), got ${fields.length} fields`
                )
            }

            return {
                [variantSchema.name]: Object.fromEntries(
                    fields.map((f, i) => [
                        variantSchema.fieldTypes[i].name,
                        uplcToSchema(
                            variantSchema.fieldTypes[i].type,
                            f,
                            config,
                            defs
                        )
                    ])
                )
            }
        }
        case "variant": {
            defs[schema.id] = schema
            const { fields } = ConstrData.expect(data)

            return Object.fromEntries(
                fields.map((field, i) => [
                    schema.fieldTypes[i].name,
                    uplcToSchema(schema.fieldTypes[i].type, field, config, defs)
                ])
            )
        }
        default:
            throw new Error(`unhandled schema kind '${kind}'`)
    }
}

/**
 * @template TStrict
 * @template TPermissive
 * @param {CastLike<TStrict, TPermissive>} cast
 * @param {CastConfig} config
 * @returns {Cast<TStrict, TPermissive>}
 */
export function configureCast(cast, config) {
    if (cast instanceof Cast) {
        return cast
    } else {
        return cast(config)
    }
}
