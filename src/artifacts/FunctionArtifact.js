import { bytesToHex } from "@helios-lang/codec-utils"
import { expectDefined, isRight } from "@helios-lang/type-utils"
import {
    genUserFuncArgsType,
    genUserFuncRetType
} from "../codegen/LoadedScriptsWriter.js"
import { ChildArtifactWriter } from "./ChildArtifactWriter.js"

/**
 * @import { UplcProgram } from "@helios-lang/uplc"
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

        this.addImport("evalUserFunc", "@helios-lang/contract-utils")
            .writeDeclLine(
                `export function $eval(args${isConst ? "?" : ""}: ${safeArgsType}, logOptions?: UplcLogger | undefined): ${retType}`
            )
            .writeDefLine(
                `export function $eval(args${isConst ? " = {}" : ""}, logOptions = undefined) {
    return evalUserFunc($program, $props, args, logOptions)
}`
            )
            .addImport("evalUserFuncUnsafe", "@helios-lang/contract-utils")
            .writeDeclLine(
                `export function $evalUnsafe(args${isConst ? "?" : ""}: ${unsafeArgsType}, logOptions?: UplcLogger | undefined): ${unsafeRetType}`
            )
            .writeDefLine(
                `export function $evalUnsafe(args${isConst ? " = {}" : ""}, logOptions = undefined) {
    return evalUserFuncUnsafe($program, $props, args, logOptions)
}`
            )
            .addImport("profileUserFunc", "@helios-lang/contract-utils")
            .writeDeclLine(
                `export function $profile(args${isConst ? "?" : ""}: ${unsafeArgsType}, logOptions?: UplcLogger | undefined): CekResult`
            )
            .writeDefLine(`export function $profile(args${isConst ? " = {}" : ""}, logOptions = undefined) {
    return profileUserFunc($program, $props, args, logOptions)
}`)

        if (isConst) {
            // attempt to evaluate, and add $data
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
                        .writeDeclLine(
                            `export const $constData: ${uplcDataType}`
                        )
                        .addImport("decodeUplcData", "@helios-lang/uplc", false)
                        .writeDefLine(
                            `export const $constData = /* @__PURE__ */ decodeUplcData("${bytesToHex(data.toCbor())}")`
                        )

                    // TODO: $constValue
                }
            } catch (_e) {
                // don't do anything, simply ignore
            }
        }
    }
}
