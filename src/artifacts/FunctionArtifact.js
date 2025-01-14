import { bytesToHex } from "@helios-lang/codec-utils"
import { expectDefined, isRight } from "@helios-lang/type-utils"
import { convertFromUplcData } from "../cast/index.js"
import {
    genUserFuncArgsType,
    genUserFuncRetType
} from "../codegen/LoadedScriptsWriter.js"
import { genTypes } from "../codegen/TypeSchema.js"
import { ChildArtifactWriter } from "./ChildArtifactWriter.js"

/**
 * @import { Address, AssetClass } from "@helios-lang/ledger"
 * @import { TypeSchema } from "@helios-lang/type-utils"
 * @import { UplcData, UplcProgram } from "@helios-lang/uplc"
 * @import { UserFuncProps } from "../index.js"
 * @import { Artifact } from "./Artifact.js"
 * @import { FunctionDetails } from "./symbols.js"
 */

/**
 * @param {Artifact} parent
 * @param {string} name
 * @param {FunctionDetails} details
 */
export function writeFunctionArtifact(parent, name, details) {
    const artifact = new FunctionArtifact(parent, name)

    const program = details.uplc
    const props = details.props

    artifact.writeProgram("$program", program, true)
    artifact.writeProps(props)
    artifact.writeEvals(program, props)

    artifact.save()

    parent.writeAggregateExport(name)
}

/**
 * @implements {Artifact}
 */
class FunctionArtifact extends ChildArtifactWriter {
    /**
     * @param {UserFuncProps} props
     */
    writeProps(props) {
        this.addImport("UserFuncProps", "@helios-lang/contract-utils", true)

        this.writeDeclLine(`export const $props: UserFuncProps`)
            .writeDefLine(`/**
 * @type {import("@helios-lang/contract-utils").UserFuncProps}
 */
export const $props = ${JSON.stringify(props, undefined, 4)}`)
    }

    /**
     * @param {UplcProgram} program
     * @param {UserFuncProps} props
     */
    writeEvals(program, props) {
        const safeArgsType = genUserFuncArgsType(props)
        const unsafeArgsType = genUserFuncArgsType(props, true)
        const retType = genUserFuncRetType(props)
        const unsafeRetType = genUserFuncRetType(props, true)
        const isConst = safeArgsType == "{}"

        this.addImport("UplcLogger", "@helios-lang/uplc", true)
        this.addImport("UplcData", "@helios-lang/uplc", true)
        this.addImport("CekResult", "@helios-lang/uplc", true)

        this.addImport("evalUserFunc", "@helios-lang/contract-utils", false)
            .writeDeclLine(
                `export function $eval(args${isConst ? "?" : ""}: ${safeArgsType}, logOptions?: UplcLogger | undefined): ${retType}`
            )
            .writeDefLine(
                `export function $eval(args${isConst ? " = {}" : ""}, logOptions = undefined) {
    return evalUserFunc($program, $props, args, logOptions)
}`
            )
            .addImport(
                "evalUserFuncUnsafe",
                "@helios-lang/contract-utils",
                false
            )
            .writeDeclLine(
                `export function $evalUnsafe(args${isConst ? "?" : ""}: ${unsafeArgsType}, logOptions?: UplcLogger | undefined): ${unsafeRetType}`
            )
            .writeDefLine(
                `export function $evalUnsafe(args${isConst ? " = {}" : ""}, logOptions = undefined) {
    return evalUserFuncUnsafe($program, $props, args, logOptions)
}`
            )
            .addImport("profileUserFunc", "@helios-lang/contract-utils", false)
            .writeDeclLine(
                `export function $profile(args${isConst ? "?" : ""}: ${unsafeArgsType}, logOptions?: UplcLogger | undefined): CekResult`
            )
            .writeDefLine(`export function $profile(args${isConst ? " = {}" : ""}, logOptions = undefined) {
    return profileUserFunc($program, $props, args, logOptions)
}`)

        if (isConst && props.returns) {
            // attempt to evaluate, and add $constData and $constValue
            try {
                const result = program.eval([])

                if (
                    isRight(result.result) &&
                    typeof result.result.right != "string" &&
                    result.result.right.kind == "data"
                ) {
                    const data = result.result.right.value

                    const uplcDataType = expectDefined(
                        {
                            int: "IntData",
                            bytes: "ByteArrayData",
                            constr: "ConstrData",
                            map: "MapData",
                            list: "ListData"
                        }[data.kind]
                    )

                    this.addImport(uplcDataType, "@helios-lang/uplc", true)
                        .writeDeclLine(`export const $constCborHex: string`)
                        .writeDefLine(
                            `export const $constCborHex = "${bytesToHex(data.toCbor())}"`
                        )
                        .writeDeclLine(
                            `export const $constData: ${uplcDataType}`
                        )
                        .addImport("decodeUplcData", "@helios-lang/uplc", false)
                        .writeDefLine(
                            `export const $constData = /* @__PURE__ */ decodeUplcData($constCborHex)`
                        )

                    const valueTypeSchema = props.returns
                    const valueTypes = genTypes(valueTypeSchema)
                    this.collectAndImportTypes(valueTypeSchema)
                    this.writeDeclLine(
                        `export const $constValue: ${valueTypes[0]}`
                    )

                    const value = convertFromUplcData(valueTypeSchema, data, {
                        isMainnet: this.isMainnet
                    })
                    const constValueStr = this.stringifyConstValue(
                        valueTypeSchema,
                        data,
                        value
                    )

                    if (constValueStr !== undefined) {
                        this.writeDefLine(
                            `export const $constValue = ${constValueStr}`
                        )
                    } else {
                        // fallback
                        this.addImport(
                            "convertFromUplcData",
                            "@helios-lang/contract-utils",
                            false
                        )
                            .writeDefLine(`export const $constValue = /* @__PURE__ */ convertFromUplcData(${JSON.stringify(valueTypeSchema)}, $constData, {
    isMainnet: ${this.isMainnet}
})`)
                    }
                }
            } catch (_e) {
                // don't do anything, simply ignore
            }
        }
    }

    /**
     * @param {TypeSchema} schema
     * @param {UplcData} data
     * @param {any} value
     * @returns {string | undefined}
     */
    stringifyConstValue(schema, data, value) {
        // TODO: it might be more efficient to represent the following directly as a primitive value
        if (schema.kind == "internal" && schema.name == "Address") {
            /**
             * @type {Address}
             */
            const v = value
            if (v.era == "Shelley") {
                this.addImport(
                    "makeShelleyAddress",
                    "@helios-lang/ledger",
                    false
                )
                return `/* @__PURE__ */ makeShelleyAddress("${v.toBech32()}")`
            }
        } else if (schema.kind == "internal" && schema.name == "AssetClass") {
            /**
             * @type {AssetClass}
             */
            const v = value
            this.addImport("parseAssetClass", "@helios-lang/ledger", false)
            return `/* @__PURE__ */ parseAssetClass("${v.toString()}")`
        } else if (schema.kind == "internal" && schema.name == "Bool") {
            /**
             * @type {boolean}
             */
            const v = value
            return v.toString()
        } else if (schema.kind == "internal" && schema.name == "ByteArray") {
            /**
             * @type {number[]}
             */
            const v = value
            return `[${v.map((b) => b.toString()).join(", ")}]`
        } else if (
            schema.kind == "internal" &&
            ["Any", "Data"].includes(schema.name)
        ) {
            return "$constData"
        } else if (
            schema.kind == "internal" &&
            ["Duration", "Int"].includes(schema.name)
        ) {
            /**
             * @type {bigint}
             */
            const v = value
            return `${v.toString()}n`
        } else if (
            schema.kind == "internal" &&
            [
                "MintingPolicyHash",
                "PubKeyHash",
                "StakingValidatorHash",
                "TxId",
                "ValidatorHash"
            ].includes(schema.name)
        ) {
            /**
             * @type {{bytes: number[]}}
             */
            const v = value
            const makerFunc = `make${schema.name}`
            this.addImport(makerFunc, "@helios-lang/ledger", false)
            return `/* @__PURE__ */ ${makerFunc}("${bytesToHex(v.bytes)}")`
        } else if (
            schema.kind == "internal" &&
            ["Real", "Time"].includes(schema.name)
        ) {
            /**
             * @type {number}
             */
            const v = value
            return v.toString()
        } else if (schema.kind == "internal" && schema.name == "String") {
            /**
             * @type {string}
             */
            const v = value
            return `"${v.toString()}"`
        }

        return undefined
    }
}
