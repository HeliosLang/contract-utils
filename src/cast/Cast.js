import { decodeUtf8, encodeUtf8 } from "@helios-lang/codec-utils"
import {
    convertSpendingCredentialToUplcData,
    convertStakingCredentialToUplcData,
    convertUplcDataToAssetClass,
    convertUplcDataToMintingPolicyHash,
    convertUplcDataToPubKey,
    convertUplcDataToPubKeyHash,
    convertUplcDataToShelleyAddress,
    convertUplcDataToSpendingCredential,
    convertUplcDataToStakingCredential,
    convertUplcDataToStakingValidatorHash,
    convertUplcDataToTimeRange,
    convertUplcDataToTxId,
    convertUplcDataToTxInput,
    convertUplcDataToTxOutput,
    convertUplcDataToTxOutputDatum,
    convertUplcDataToTxOutputId,
    convertUplcDataToValidatorHash,
    convertUplcDataToValue,
    makeAddress,
    makeAssetClass,
    makeDatumHash,
    makeMintingPolicyHash,
    makePubKey,
    makePubKeyHash,
    makeStakingValidatorHash,
    makeTimeRange,
    makeTxId,
    makeTxOutputDatum,
    makeTxOutputId,
    makeValidatorHash,
    makeValue
} from "@helios-lang/ledger"
import { expectDefined } from "@helios-lang/type-utils"
import {
    uplcDataToBool,
    unwrapUplcDataOption,
    uplcDataToReal,
    boolToUplcData,
    wrapUplcDataOption,
    realToUplcData,
    expectByteArrayData,
    expectConstrData,
    expectIntData,
    expectListData,
    expectMapData,
    makeByteArrayData,
    makeConstrData,
    makeIntData,
    makeListData,
    makeMapData
} from "@helios-lang/uplc"

/**
 * @import { TxInput, TxOutput } from "@helios-lang/ledger"
 * @import { EnumTypeSchema, TypeSchema } from "@helios-lang/type-utils"
 * @import { ConstrData, UplcData } from "@helios-lang/uplc"
 * @import { Cast, CastConfig, CastLike } from "../index.js"
 */

/**
 * @typedef {Object} SchemaToUplcContext
 * @prop {Record<string, TypeSchema>} defs - symbol table permitting recursive schema references
 * @prop {string} dataPath - provides developer-facing cues for any parsing errors, showing the deep field path of any error
 * @prop {boolean} unwrapSingleFieldEnumVariants - defaults to false. If true, assumes the following input objects for enum variants: `{VariantName: SingleFieldData}`, instead of  the more verbose `{VariantName: {SingleFieldName: SingleFieldData}}`
 */

/**
 * @typedef {Object} UplcToSchemaContext
 * @prop {Record<string, TypeSchema>} defs - symbol table permitting recursive schema references
 * @prop {string} dataPath - provides developer-facing cues for any parsing errors, showing the deep field path of any error
 * @prop {boolean} unwrapSingleFieldEnumVariants - defaults to false. If true, the following enum variant outputs are created: `{VariantName: SingleFieldData}`, instead of  the more verbose `{VariantName: {SingleFieldName: SingleFieldData}}`
 * @prop {boolean} isMainnet
 */

/**
 * @template TStrict
 * @template TPermissive=TStrict
 * @param {TypeSchema} schema
 * @param {CastConfig} config
 * @returns {Cast<TStrict, TPermissive>}
 */
export function makeCast(schema, config) {
    return new CastImpl(schema, config)
}

/**
 * @template TStrict
 * @template TPermissive=TStrict
 * @implements {Cast<TStrict, TPermissive>}
 */
class CastImpl {
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
     * @type {"Cast"}
     */
    get kind() {
        return "Cast"
    }

    /**
     * @param {UplcData} data
     * @param {string} [dataPath] - can be used to indicate the kind or context of data-decoding
     * @returns {TStrict}
     */
    fromUplcData(data, dataPath = "") {
        return convertFromUplcData(this.schema, data, {
            isMainnet: this.config.isMainnet,
            unwrapSingleFieldEnumVariants:
                !!this.config.unwrapSingleFieldEnumVariants,
            dataPath
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
        return convertToUplcData(this.schema, x, {
            dataPath,
            unwrapSingleFieldEnumVariants:
                !!this.config.unwrapSingleFieldEnumVariants
        })
    }
}

/**
 * @template T
 * @param {TypeSchema} schema
 * @param {UplcData} data
 * @param {{
 *   isMainnet: boolean,
 *   dataPath?: string,
 *   unwrapSingleFieldEnumVariants?: boolean
 * }} options
 * @returns {T}
 */
export function convertFromUplcData(schema, data, options) {
    return convertUplcDataToSchemaDataWithDataPath(schema, data, {
        isMainnet: options.isMainnet,
        unwrapSingleFieldEnumVariants: !!options.unwrapSingleFieldEnumVariants,
        dataPath: options.dataPath ?? "",
        defs: {}
    })
}

/**
 * @template T
 * @param {TypeSchema} schema
 * @param {T} x
 * @param {{
 *   dataPath?: string,
 *   unwrapSingleFieldEnumVariants?: boolean
 * }} [options]
 * @returns {UplcData}
 */
export function convertToUplcData(schema, x, options = {}) {
    const t = convertSchemaDataToUplcDataWithDataPath(schema, x, {
        defs: {},
        unwrapSingleFieldEnumVariants: !!options.unwrapSingleFieldEnumVariants,
        dataPath: options.dataPath ?? ""
    })
    t.rawData = x
    return t
}

/**
 * @param {TypeSchema} schema
 * @param {any} x - data
 * @param {SchemaToUplcContext} context
 * @returns {UplcData}
 */
function convertSchemaDataToUplcDataWithDataPath(schema, x, context) {
    try {
        const t = convertSchemaDataToUplcData(schema, x, context)
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
 * @template T [{dataPath: string}]
 * @param {T} context
 * @param {string} dataPath
 * @returns {T}
 */
function passContext(context, dataPath) {
    return {
        ...context,
        dataPath
    }
}

/**
 * @param {TypeSchema} schema
 * @param {any} x - JS data
 * @param {SchemaToUplcContext} context
 * @returns {UplcData}
 */
function convertSchemaDataToUplcData(schema, x, context) {
    const { dataPath, defs } = context

    const kind = schema.kind
    switch (kind) {
        case "reference": {
            const def = expectDefined(defs[schema.id])
            return convertSchemaDataToUplcDataWithDataPath(
                def,
                x,
                passContext(context, `${dataPath}::ref{${schema.id}}`)
            )
        }
        case "internal": {
            const name = schema.name

            switch (name) {
                case "Address":
                    return makeAddress(x).toUplcData()
                case "Any":
                    return makeIntData(0n)
                case "AssetClass":
                    return makeAssetClass(x).toUplcData()
                case "Bool":
                    return boolToUplcData(x)
                case "ByteArray":
                    return makeByteArrayData(x)
                case "Credential":
                case "SpendingCredential":
                    return convertSpendingCredentialToUplcData(x)
                case "Data":
                    return x
                case "DatumHash":
                    return makeDatumHash(x).toUplcData()
                case "DCert":
                    return x.toUplcData()
                case "Duration":
                case "Int":
                    return makeIntData(x)
                case "MintingPolicyHash":
                    return makeMintingPolicyHash(x).toUplcData()
                case "PubKey":
                    return makePubKey(x).toUplcData()
                case "PubKeyHash":
                    return makePubKeyHash(x).toUplcData()
                case "Real":
                    return realToUplcData(x)
                case "Ratio":
                    return makeListData([makeIntData(x[0]), makeIntData(x[1])])
                case "ScriptHash":
                    return makeByteArrayData(makeValidatorHash(x).bytes)
                case "StakingCredential":
                    return convertStakingCredentialToUplcData(makePubKeyHash(x))
                case "StakingHash":
                    throw new Error("not yet implemented")
                case "StakingValidatorHash":
                    return makeStakingValidatorHash(x).toUplcData()
                case "String":
                    return makeByteArrayData(encodeUtf8(x))
                case "Time":
                    return makeIntData(x)
                case "TimeRange":
                    return makeTimeRange(x).toUplcData()
                case "TxId":
                    return makeTxId(x).toUplcData()
                case "TxInput":
                    return /** @type {TxInput} */ (x).toUplcData()
                case "TxOutput":
                    return /** @type {TxOutput} */ (x).toUplcData()
                case "TxOutputDatum":
                    return x
                        ? (makeTxOutputDatum(x)?.toUplcData() ??
                              makeConstrData(0, []))
                        : makeConstrData(0, [])
                case "TxOutputId":
                    return makeTxOutputId(x).toUplcData()
                case "ValidatorHash":
                    return makeValidatorHash(x).toUplcData()
                case "Value":
                    return makeValue(x).toUplcData()
                default:
                    throw new Error(
                        `schemaToUplc not yet implemented for ${name}`
                    )
            }
        }
        case "list":
            return makeListData(
                x.map((x, i) =>
                    convertSchemaDataToUplcDataWithDataPath(
                        schema.itemType,
                        x,
                        passContext(context, `${dataPath}.list[${i}]`)
                    )
                )
            )
        case "map": {
            const entries =
                x instanceof Map
                    ? [...x.entries()]
                    : Array.isArray(x)
                      ? x
                      : Object.entries(x)
            return makeMapData(
                entries.map(([k, v], i) => {
                    const displayKey = "string" == typeof k ? `'${k}'` : `@{i}`
                    return [
                        convertSchemaDataToUplcDataWithDataPath(
                            schema.keyType,
                            k,
                            passContext(
                                context,
                                `${dataPath}[mapKey ${displayKey}]`
                            )
                        ),
                        convertSchemaDataToUplcDataWithDataPath(
                            schema.valueType,
                            v,
                            passContext(
                                context,
                                `${dataPath}[mapVal ${displayKey}]`
                            )
                        )
                    ]
                })
            )
        }
        case "tuple":
            return makeListData(
                x.map((x, i) =>
                    convertSchemaDataToUplcDataWithDataPath(
                        schema.itemTypes[i],
                        x,
                        passContext(context, `${dataPath}[tuple@${i}]`)
                    )
                )
            )
        case "option":
            return wrapUplcDataOption(
                x
                    ? convertSchemaDataToUplcDataWithDataPath(
                          schema.someType,
                          x,
                          passContext(context, `${dataPath}::Some`)
                      )
                    : undefined
            )
        case "struct": {
            defs[schema.id] = schema
            switch (schema.format) {
                case "singleton":
                    const singleFieldName = schema.fieldTypes[0].name
                    return convertSchemaDataToUplcDataWithDataPath(
                        schema.fieldTypes[0].type,
                        x[singleFieldName],
                        passContext(
                            context,
                            `${dataPath}[sfStruct.${singleFieldName}]`
                        )
                    )
                case "list":
                    return makeListData(
                        schema.fieldTypes.map(({ name, type }) =>
                            convertSchemaDataToUplcDataWithDataPath(
                                type,
                                x[name],
                                passContext(
                                    context,
                                    `${dataPath}[fStruct].${name}`
                                )
                            )
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
                            const keyData = makeByteArrayData(
                                encodeUtf8(encodingKey)
                            )

                            const valueData =
                                convertSchemaDataToUplcDataWithDataPath(
                                    ft.type,
                                    value,
                                    passContext(
                                        context,
                                        `${dataPath}[mStruct].${fieldName}${encodingInfo}`
                                    )
                                )

                            pairs.push([keyData, valueData])
                        }
                    })

                    // A struct targeting CIP-68 compliance must have ConstrData
                    // ... due to its explicitly-declared Enum variant in developer-land.
                    //
                    // We just return our MapData, and we don't care whether it's used in any particular context.

                    return makeMapData(pairs)
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
            const foundVariant = schema.variantTypes.find(
                (v) => v.name == variantName
            )
            if (!foundVariant) {
                throw new Error(
                    `invalid enum variant '${variantName}' (expected one of: ${schema.variantTypes
                        .map((v) => v.name)
                        .join(", ")})`
                )
            }
            const tag = foundVariant.tag

            return convertEnumVariantDataToConstrData(
                schema,
                tag,
                variantFields,
                passContext(context, dataPath)
            )
        }
        case "variant":
            defs[schema.id] = schema

            return makeConstrData(
                schema.tag,
                schema.fieldTypes.map(({ name, type }) =>
                    convertSchemaDataToUplcDataWithDataPath(
                        type,
                        x[name],
                        passContext(
                            context,
                            `${dataPath}[enumVariant ${schema.id}.${name}`
                        )
                    )
                )
            )
        default:
            throw new Error(`unhandled schema kind '${kind}'`)
    }
}

/**
 * Gives the encoding of nested data a context to prevent a second ConstrData wrapper on the MapData
 *  ... only for the first field.
 * @param {EnumTypeSchema} schema
 * @param {number} tag
 * @param {any} data - can be any in order to represent a single unwrapped field
 * @param {SchemaToUplcContext} context
 * @returns {ConstrData}
 */
function convertEnumVariantDataToConstrData(schema, tag, data, context) {
    const variantSchema = schema.variantTypes.find((v) => v.tag == tag)
    if (!variantSchema) {
        throw new Error(
            `invalid enum variant tag ${tag} (expected one of: ${schema.variantTypes
                .map((v) => v.tag)
                .join(", ")})`
        )
    }
    const variantName = variantSchema.name

    if (
        context.unwrapSingleFieldEnumVariants &&
        variantSchema.fieldTypes.length == 1
    ) {
        const singleFieldName = variantSchema.fieldTypes[0].name

        // rewrap as preparation for converting to UplcData
        data = {
            [singleFieldName]: data
        }
    }

    // at this point `data` should be of type `Record<string, any>`
    return makeConstrData(
        tag,
        variantSchema.fieldTypes.map((f) =>
            convertSchemaDataToUplcDataWithDataPath(
                f.type,
                data[f.name],
                passContext(
                    context,
                    `[${schema.name}::${variantName}].${f.name}`
                )
            )
        )
    )
}

/**
 * @param {TypeSchema} schema
 * @param {UplcData} data
 * @param {UplcToSchemaContext} context
 * @returns {any}
 */
function convertUplcDataToSchemaDataWithDataPath(schema, data, context) {
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
 * @param {UplcToSchemaContext} context
 * @returns {any}
 */
function uplcToSchema(schema, data, context) {
    const kind = schema.kind
    const { dataPath, defs, isMainnet } = context

    switch (kind) {
        case "internal": {
            const name = schema.name

            switch (name) {
                case "Address":
                    return convertUplcDataToShelleyAddress(isMainnet, data)
                case "Any":
                    // TODO: should this throw an error?
                    return null
                case "AssetClass":
                    return convertUplcDataToAssetClass(data)
                case "Bool":
                    return uplcDataToBool(data, true)
                case "ByteArray":
                    return expectByteArrayData(data).bytes
                case "SpendingCredential":
                case "Credential":
                    return convertUplcDataToSpendingCredential(data)
                case "Data":
                    return data
                case "DCert":
                    throw new Error(
                        "can't convert UplcData back into DCert (significant loss of information)"
                    )
                case "Duration":
                case "Int":
                    return expectIntData(data).value
                case "MintingPolicyHash":
                    return convertUplcDataToMintingPolicyHash(data)
                case "PubKey":
                    return convertUplcDataToPubKey(data)
                case "PubKeyHash":
                    return convertUplcDataToPubKeyHash(data)
                case "Ratio": {
                    const [top, bottom] = expectListData(data).items
                    return [
                        expectIntData(top).value,
                        expectIntData(bottom).value
                    ]
                }
                case "Real":
                    return uplcDataToReal(data)
                case "ScriptHash":
                    return expectByteArrayData(data).bytes
                case "StakingCredential":
                    return convertUplcDataToStakingCredential(data)
                case "StakingHash":
                    throw new Error("not yet implemented")
                case "StakingValidatorHash":
                    return convertUplcDataToStakingValidatorHash(data)
                case "String":
                    return decodeUtf8(expectByteArrayData(data).bytes)
                case "Time":
                    return Number(expectIntData(data).value) // a number has enough precision to represent ms since 1970 for another 142000 years
                case "TimeRange":
                    return convertUplcDataToTimeRange(data)
                case "TxId":
                    return convertUplcDataToTxId(data)
                case "TxInput":
                    return convertUplcDataToTxInput(isMainnet, data)
                case "TxOutput":
                    return convertUplcDataToTxOutput(isMainnet, data)
                case "TxOutputDatum":
                    return convertUplcDataToTxOutputDatum(data)
                case "TxOutputId":
                    return convertUplcDataToTxOutputId(data)
                case "ValidatorHash":
                    return convertUplcDataToValidatorHash(data)
                case "Value":
                    return convertUplcDataToValue(data)
                default:
                    throw new Error(`not yet implemented for ${name}`)
            }
        }
        case "list":
            return expectListData(data).items.map((x, i) =>
                convertUplcDataToSchemaDataWithDataPath(
                    schema.itemType,
                    x,
                    passContext(context, `${dataPath}[${i}]`)
                )
            )
        case "map":
            return new Map(
                expectMapData(data).items.map(([k, v], i) => {
                    const key = convertUplcDataToSchemaDataWithDataPath(
                        schema.keyType,
                        k,
                        passContext(context, `${dataPath}[mapKey @${i}]`)
                    )
                    const displayKey =
                        "string" == typeof key ? `'${key}'` : `@{i}`
                    return [
                        key,
                        convertUplcDataToSchemaDataWithDataPath(
                            schema.valueType,
                            v,
                            passContext(
                                context,
                                `${dataPath}[mapVal ${displayKey}]`
                            )
                        )
                    ]
                })
            )
        case "tuple":
            return expectListData(data).items.map((x, i) =>
                convertUplcDataToSchemaDataWithDataPath(
                    schema.itemTypes[i],
                    x,
                    passContext(context, `${dataPath}[tuple@${i}]`)
                )
            )
        case "option": {
            const optionData = unwrapUplcDataOption(data)
            return optionData
                ? convertUplcDataToSchemaDataWithDataPath(
                      schema.someType,
                      optionData,
                      passContext(context, `${dataPath}::Some`)
                  )
                : undefined
        }
        case "struct": {
            defs[schema.id] = schema
            switch (schema.format) {
                case "singleton":
                    return {
                        [schema.fieldTypes[0].name]:
                            convertUplcDataToSchemaDataWithDataPath(
                                schema.fieldTypes[0].type,
                                data,
                                passContext(context, `${dataPath}[sfStruct]`)
                            )
                    }
                case "list": {
                    const fields = expectListData(data).items

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
                                convertUplcDataToSchemaDataWithDataPath(
                                    type,
                                    field,
                                    passContext(
                                        context,
                                        `${dataPath}[fStruct].${name}`
                                    )
                                )
                            ]
                        })
                    )
                }
                case "map": {
                    // never uses a ConstrData (one MAY be used in the Enum layer, if needed)
                    const encodedEntries = expectMapData(data).items

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
                                decodeUtf8(expectByteArrayData(key).bytes)
                            )
                        })
                    }
                    // loops over the Schema fields:
                    return Object.fromEntries(
                        schema.fieldTypes
                            .map(({ name, type, key: encodingKey }) => {
                                const i = expectDefined(
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
                                    convertUplcDataToSchemaDataWithDataPath(
                                        type,
                                        encodedDataPair[1],
                                        passContext(
                                            context,
                                            `${dataPath}[mStruct].${name}`
                                        )
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

            return convertConstrDataFieldsToEnumVariantFields(
                schema,
                expectConstrData(data),
                passContext(context, dataPath)
            )
        }
        case "variant": {
            defs[schema.id] = schema
            const { fields } = expectConstrData(data)

            return Object.fromEntries(
                fields.map((field, i) => [
                    schema.fieldTypes[i].name,
                    convertUplcDataToSchemaDataWithDataPath(
                        schema.fieldTypes[i].type,
                        field,
                        passContext(
                            context,
                            `${dataPath}[enumVariant ${schema.id}].${schema.fieldTypes[i].name}`
                        )
                    )
                ])
            )
        }
        default:
            throw new Error(`unhandled schema kind '${kind}'`)
    }
}

/**
 * @param {EnumTypeSchema} schema
 * @param {ConstrData} data
 * @param {UplcToSchemaContext} context
 * @returns {Record<string, any>}
 */
function convertConstrDataFieldsToEnumVariantFields(schema, data, context) {
    const { tag, fields } = data

    const variantSchema = schema.variantTypes.find((v) => v.tag == tag)

    if (!variantSchema) {
        throw new Error(
            `invalid enum variant tag ${tag} (expected one of: ${schema.variantTypes
                .map((v) => v.tag)
                .join(", ")})`
        )
    }

    const nExpected = variantSchema.fieldTypes.length

    if (fields.length != nExpected) {
        throw new Error(
            `expected ${nExpected} fields for variant ${variantSchema.name} (tag ${tag}), got ${fields.length} fields`
        )
    }
    const result = {
        [variantSchema.name]: Object.fromEntries(
            fields.map((f, i) => [
                variantSchema.fieldTypes[i].name,
                convertUplcDataToSchemaDataWithDataPath(
                    variantSchema.fieldTypes[i].type,
                    f,
                    passContext(
                        context,
                        `${context.dataPath}[${schema.name}::${variantSchema.name}]`
                    )
                )
            ])
        )
    }

    if (
        context.unwrapSingleFieldEnumVariants &&
        variantSchema.fieldTypes.length == 1
    ) {
        const singleFieldName = variantSchema.fieldTypes[0].name
        const variantName = variantSchema.name
        result[variantName] = result[variantName][singleFieldName]
    }

    return result
}

/**
 * @template TStrict
 * @template TPermissive
 * @param {CastLike<TStrict, TPermissive>} cast
 * @param {CastConfig} config
 * @returns {Cast<TStrict, TPermissive>}
 */
export function configureCast(cast, config) {
    if ("kind" in cast && cast.kind == "Cast") {
        return cast
    } else {
        return /** @type {any} */ (cast)(config)
    }
}
