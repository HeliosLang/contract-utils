import { decodeUtf8, encodeUtf8 } from "@helios-lang/codec-utils"
import {
    Address,
    AssetClass,
    DatumHash,
    MintingPolicyHash,
    PubKey,
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
import { None, expectSome, isSome } from "@helios-lang/type-utils"
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
 * @typedef {Object} SchemaToUplcContext
 * @property {Record<string, TypeSchema>} defs - symbol table permitting recursive schema references
 * @property {string} dataPath - provides developer-facing cues for any parsing errors, showing the deep field path of any error
 * @property {boolean} [isInEnum] - a single-level indicator of being directly inside an enum (internal use)
 */

/**
 * @typedef {Object} UplcToSchemaContext
 * @property {Record<string, TypeSchema>} defs - symbol table permitting recursive schema references
 * @property {string} dataPath - provides developer-facing cues for any parsing errors, showing the deep field path of any error
 * @property {boolean} [isInEnum] - a single-level indicator of being directly inside an enum (internal use)
 * @property {CastConfig} config - has isMainnet indicator
 */

/**
 * @template TStrict
 * @template TPermissive=TStrict
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
     * @param {string} [dataPath] - can be used to indicate the kind or context of data-decoding
     * @returns {TStrict}
     */
    fromUplcData(data, dataPath = "") {
        return uplcToSchemaWithDataPath(this.schema, data, {
            config: this.config,
            dataPath,
            defs: {}
        })
    }

    /**
     * converts javascript object to UPLC data, according to the schema.
     * @remarks
     * The optional `dataPath` parameter can provide a contextual cue for the
     * data-conversion process, and will be displayed as part of any error messages
     * thrown during the data transformation
     *
     * @param {TPermissive} x
     * @param {string} dataPath
     * @returns {UplcData}
     */
    toUplcData(x, dataPath = "") {
        const t = schemaToUplcWithDataPath(this.schema, x, {
            defs: {},
            dataPath
        })
        t.rawData = x
        return t
    }
}

/**
 * @param {TypeSchema} schema
 * @param {any} x
 * @param {SchemaToUplcContext} context
 * @returns {UplcData}
 */
function schemaToUplcWithDataPath(schema, x, context) {
    try {
        const t = schemaToUplc(schema, x, context)
        t.dataPath = context.dataPath
        return t
    } catch (e) {
        if (!e.uplcDataPath) {
            e.message = `${e.message}\n ... at ${context.dataPath}`
            e.uplcDataPath = context.dataPath
        }
        debugger
        throw e
    }
}

/**
 * @param {TypeSchema} schema
 * @param {any} x
 * @param {SchemaToUplcContext} inputContextOnly
 * @returns {UplcData}
 */
function schemaToUplc(schema, x, inputContextOnly) {
    // const { +defs = {}, dataPath = "", isInEnum = false } = inputContext
    // important: DON'T extend the inputContext for use in nested calls.
    const { dataPath, isInEnum, defs } = inputContextOnly

    // Only the defs can be passed down, and it's simpler syntactically
    //   ... just use the defs directly in the nested calls.

    const kind = schema.kind
    switch (kind) {
        case "reference": {
            const def = expectSome(defs[schema.id])
            return schemaToUplcWithDataPath(def, x, {
                defs,
                dataPath: `${dataPath}::ref{${schema.id}}`
            })
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
                case "PubKey":
                    return PubKey.new(x).toUplcData()
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
                        ? (TxOutputDatum.new(x)?.toUplcData() ??
                              new ConstrData(0, []))
                        : new ConstrData(0, [])
                case "TxOutputId":
                    return TxOutputId.new(x).toUplcData()
                case "ValidatorHash":
                    return ValidatorHash.new(x).toUplcData()
                case "Value":
                    return Value.new(x).toUplcData()
                default:
                    throw new Error(
                        `schemaToUplc not yet implemented for ${name}`
                    )
            }
        }
        case "list":
            return new ListData(
                x.map((x, i) =>
                    schemaToUplcWithDataPath(schema.itemType, x, {
                        defs,
                        dataPath: `${dataPath}.list[${i}]`
                    })
                )
            )
        case "map": {
            const entries =
                x instanceof Map
                    ? [...x.entries()]
                    : Array.isArray(x)
                      ? x
                      : Object.entries(x)
            return new MapData(
                entries.map(([k, v], i) => {
                    const displayKey = "string" == typeof k ? `'${k}'` : `@{i}`
                    return [
                        schemaToUplcWithDataPath(schema.keyType, k, {
                            defs,
                            dataPath: `${dataPath}[mapKey ${displayKey}]`
                        }),
                        schemaToUplcWithDataPath(schema.valueType, v, {
                            defs,
                            dataPath: `${dataPath}[mapVal ${displayKey}]`
                        })
                    ]
                })
            )
        }
        case "tuple":
            return new ListData(
                x.map((x, i) =>
                    schemaToUplcWithDataPath(schema.itemTypes[i], x, {
                        defs,
                        dataPath: `${dataPath}[tuple@${i}]`
                    })
                )
            )
        case "option":
            return encodeOptionData(
                x
                    ? schemaToUplcWithDataPath(schema.someType, x, {
                          defs,
                          dataPath: `${dataPath}::Some`
                      })
                    : None
            )
        case "struct": {
            defs[schema.id] = schema
            switch (schema.format) {
                case "singleton":
                    const singleFieldName = schema.fieldTypes[0].name
                    return schemaToUplcWithDataPath(
                        schema.fieldTypes[0].type,
                        x[singleFieldName],
                        {
                            defs,
                            dataPath: `${dataPath}[sfStruct.${singleFieldName}]`
                        }
                    )
                case "list":
                    return new ListData(
                        schema.fieldTypes.map(({ name, type }) =>
                            schemaToUplcWithDataPath(type, x[name], {
                                defs,
                                dataPath: `${dataPath}[fStruct].${name}`
                            })
                        )
                    )
                case "map": {
                    // first make sure all fields are present
                    schema.fieldTypes.forEach((ft) => {
                        // todo: ? allow Option[T] fields to be missing?

                        if (!(ft.name in x)) {
                            if (ft.key && ft.key in x) {
                                const encodingInfo = ft.key
                                    ? `incorrectly specified as encoding-key '${ft.key}'`
                                    : ""
                                throw new Error(
                                    `field '${ft.name}' ${encodingInfo}`
                                )
                            }
                            throw new Error(`missing field '${ft.name}'`)
                        }
                    })

                    // respect order of entries in provided data
                    // todo: ? allow encoding-order to match schema-defined order instead ?
                    // todo: ? allow the encoding to follow the encoding keys in sorted order?
                    /**
                     * @type {[UplcData, UplcData][]}
                     */
                    const pairs = []

                    Object.entries(x).forEach(([fieldName, value]) => {
                        const ft = schema.fieldTypes.find(
                            (ft) => ft.name == fieldName
                        )

                        if (ft) {
                            const encodingKey = ft.key || ft.name
                            const encodingInfo = ft.key ? ` as '${ft.key}'` : ""
                            const keyData = new ByteArrayData(
                                encodeUtf8(encodingKey)
                            )

                            const valueData = schemaToUplcWithDataPath(
                                ft.type,
                                value,
                                {
                                    defs,
                                    dataPath: `${dataPath}[mStruct].${fieldName}${encodingInfo}`
                                }
                            )

                            pairs.push([keyData, valueData])
                        }
                    })

                    // when this is a CIP-68 struct, this lets us be sensitive to the context of
                    // "it already has a ConstrData wrapper", and avoid double-wrapping it.
                    if (isInEnum) {
                        return new MapData(pairs)
                    }

                    // otherwise, wrap in ConstrData
                    return new ConstrData(0, [new MapData(pairs)])
                }
                default:
                    throw new Error(
                        `unhandled struct format '${/** @type {any} */ (schema).format}'`
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

            // Gives the encoding of nested data a context to prevent a second ConstrData wrapper on the MapData
            // ... only for the first field.
            const fieldCount = schema.variantTypes[tag].fieldTypes.length
            return new ConstrData(
                tag,
                schema.variantTypes[tag].fieldTypes.map((f, i) =>
                    schemaToUplcWithDataPath(f.type, variantFields[f.name], {
                        defs,
                        isInEnum: fieldCount <= 3 && i == 0,
                        dataPath: `${dataPath}[${schema.name}::${variantName}].${f.name}`
                    })
                )
            )
        }
        case "variant":
            defs[schema.id] = schema
            throw new Error(`unused?`)

        // return new ConstrData(
        //     schema.tag,
        //     schema.fieldTypes.map(({ name, type }) =>
        //         schemaToUplcWithDataPath(type, x[name], {
        //             defs,
        //             isInEnum: true,
        //             dataPath: `${dataPath}.${name}`
        //         })
        //     )
        // )
        default:
            throw new Error(`unhandled schema kind '${kind}'`)
    }
}

/**
 * @param {TypeSchema} schema
 * @param {UplcData} data
 * @param {UplcToSchemaContext} context
 * @returns {any}
 */
function uplcToSchemaWithDataPath(schema, data, context) {
    try {
        const t = uplcToSchema(schema, data, context)
        return t
    } catch (e) {
        if (!e.uplcDataPath) {
            e.message =
                `decoding UPLC data: ${e.message}` +
                (context.dataPath ? `\n ... at ${context.dataPath}` : "")
            e.uplcDataPath = context.dataPath
        }
        debugger
        throw e
    }
}

/**
 * This should fail when deviating
 * @param {TypeSchema} schema
 * @param {UplcData} data
 * @param {UplcToSchemaContext} inputContextOnly
 * @returns {any}
 */
function uplcToSchema(schema, data, inputContextOnly) {
    const kind = schema.kind
    const { config, defs } = inputContextOnly
    // Note: don't use the inputContext directly in nested calls.
    const { dataPath, isInEnum, ...context } = inputContextOnly
    //   use { ... context } augmented with the new dataPath and isInEnum (if applicable)

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
                case "PubKey":
                    return PubKey.fromUplcData(data)
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
                case "TxOutputDatum":
                    return TxOutputDatum.fromUplcData(data)
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
            return ListData.expect(data).items.map((x, i) =>
                uplcToSchemaWithDataPath(schema.itemType, x, {
                    ...context,
                    dataPath: `${dataPath}[${i}]`
                })
            )
        case "map":
            return new Map(
                MapData.expect(data).items.map(([k, v], i) => {
                    const key = uplcToSchemaWithDataPath(schema.keyType, k, {
                        ...context,
                        dataPath: `${dataPath}[mapKey @${i}]`
                    })
                    const displayKey =
                        "string" == typeof key ? `'${key}'` : `@{i}`
                    return [
                        key,
                        uplcToSchemaWithDataPath(schema.valueType, v, {
                            ...context,
                            dataPath: `${dataPath}[mapVal ${displayKey}]`
                        })
                    ]
                })
            )
        case "tuple":
            return ListData.expect(data).items.map((x, i) =>
                uplcToSchemaWithDataPath(schema.itemTypes[i], x, {
                    ...context,
                    dataPath: `${dataPath}[tuple@${i}]`
                })
            )
        case "option": {
            const optionData = decodeOptionData(data)
            return optionData
                ? uplcToSchemaWithDataPath(schema.someType, optionData, {
                      ...context,
                      dataPath: `${dataPath}::Some`
                  })
                : None
        }
        case "struct": {
            defs[schema.id] = schema
            switch (schema.format) {
                case "singleton":
                    return {
                        [schema.fieldTypes[0].name]: uplcToSchemaWithDataPath(
                            schema.fieldTypes[0].type,
                            data,
                            { ...context, dataPath: `${dataPath}[sfStruct]` }
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
                        fields.map((field, i) => {
                            // "field-list" structs don't have encoding-keys, by definition.
                            const { name, type } = schema.fieldTypes[i]
                            return [
                                name,
                                uplcToSchemaWithDataPath(type, field, {
                                    ...context,
                                    dataPath: `${dataPath}[fStruct].${name}`
                                })
                            ]
                        })
                    )
                }
                case "map": {
                    // might be wrapped in ConstrData
                    const encodedEntries = isInEnum
                        ? MapData.expect(data).items
                        : MapData.expect(ConstrData.expect(data).fields[0])
                              .items

                    if (encodedEntries.length != schema.fieldTypes.length) {
                        throw new Error(
                            `expected ${schema.fieldTypes.length} fields in struct, got ${encodedEntries.length} fields`
                        )
                    }

                    /**
                     * @param {string} targetName
                     * @returns {number}
                     */
                    function findSerializedFieldIndex(targetName) {
                        return encodedEntries.findIndex(([key, _]) => {
                            return (
                                targetName ==
                                decodeUtf8(ByteArrayData.expect(key).bytes)
                            )
                        })
                    }
                    // loops over the Schema fields:
                    return Object.fromEntries(
                        schema.fieldTypes
                            .map(({ name, type, key: encodingKey }) => {
                                const i = expectSome(
                                    findSerializedFieldIndex(
                                        encodingKey || name
                                    )
                                )

                                if (i == -1) {
                                    // todo: ? allow Option[T] fields to be missing?
                                    if (encodingKey) {
                                        if (
                                            findSerializedFieldIndex(name) > -1
                                        ) {
                                            throw new Error(
                                                `field '${name}' encoded by name (must be encoded as '${encodingKey}')`
                                            )
                                        }
                                        throw new Error(
                                            `field '${name}' missing (must be encoded as '${encodingKey}')`
                                        )
                                    }
                                    throw new Error(
                                        `field '${name}' missing from field map`
                                    )
                                }

                                const encodedDataPair = encodedEntries[i]

                                return /** @type {const} */ ([
                                    i,
                                    name,
                                    uplcToSchemaWithDataPath(
                                        type,
                                        encodedDataPair[1],
                                        {
                                            ...context,
                                            dataPath: `${dataPath}[mStruct].${name}`
                                        }
                                    )
                                ])
                            })
                            .sort((a, b) => a[0] - b[0])
                            .map(([_, name, x]) => [name, x])
                    )
                }
                default:
                    throw new Error(
                        `unhandled struct format '${/** @type {any} */ (schema).format}'`
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

            const fieldCount = variantSchema.fieldTypes.length
            return {
                [variantSchema.name]: Object.fromEntries(
                    fields.map((f, i) => [
                        variantSchema.fieldTypes[i].name,
                        uplcToSchemaWithDataPath(
                            variantSchema.fieldTypes[i].type,
                            f,
                            {
                                ...context,
                                dataPath: `${dataPath}[${schema.name}::${variantSchema.name}]`,
                                // only skip extra ConstrData wrapper for the first field when this
                                //   enum's shape indicates it is providing the CIP68 struct's wrapper
                                isInEnum: fieldCount <= 3 && i == 0
                            }
                        )
                    ])
                )
            }
        }
        case "variant": {
            defs[schema.id] = schema
            throw new Error(`unused?`)
            // const { fields } = ConstrData.expect(data)

            // return Object.fromEntries(
            //     fields.map((field, i) => [
            //         schema.fieldTypes[i].name,
            //         uplcToSchema(schema.fieldTypes[i].type, field, config, defs)
            //     ])
            // )
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
