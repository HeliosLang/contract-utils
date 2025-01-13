import {
    genFuncType,
    genUserFuncArgsType,
    genUserFuncRetType
} from "../codegen/LoadedScriptsWriter.js"
import { ChildArtifactWriter } from "./ChildArtifactWriter.js"

/**
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
    artifact.writeEvals(props)

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
     * @param {UserFuncProps} props
     */
    writeEvals(props) {
        const safeArgsType = genUserFuncArgsType(props)
        const unsafeArgsType = genUserFuncArgsType(props, true)
        const retType = genUserFuncRetType(props)
        const unsafeRetType = genUserFuncRetType(props, true)

        this.addImport("UplcLogger", "@helios-lang/uplc", true)
        this.addImport("UplcData", "@helios-lang/uplc", true)
        this.addImport("CekResult", "@helios-lang/uplc", true)

        this.addImport("evalUserFunc", "@helios-lang/contract-utils")
            .writeDeclLine(
                `export function $eval(args${safeArgsType == "{}" ? "?" : ""}: ${safeArgsType}, logOptions?: UplcLogger | undefined): ${retType}`
            )
            .writeDefLine(
                `export function $eval(args${safeArgsType == "{}" ? " = {}" : ""}, logOptions = undefined) {
    return evalUserFunc($program, $props, args, logOptions)
}`
            )
            .addImport("evalUserFuncUnsafe", "@helios-lang/contract-utils")
            .writeDeclLine(
                `export function $evalUnsafe(args${unsafeArgsType == "{}" ? "?" : ""}: ${unsafeArgsType}, logOptions?: UplcLogger | undefined): ${unsafeRetType}`
            )
            .writeDefLine(
                `export function $evalUnsafe(args${unsafeArgsType == "{}" ? " = {}" : ""}, logOptions = undefined) {
    return evalUserFuncUnsafe($program, $props, args, logOptions)
}`
            )
            .addImport("profileUserFunc", "@helios-lang/contract-utils")
            .writeDeclLine(
                `export function $profile(args${unsafeArgsType == "{}" ? "?" : ""}: ${unsafeArgsType}, logOptions?: UplcLogger | undefined): CekResult`
            )
            .writeDefLine(`export function $profile(args${unsafeArgsType == "{}" ? " = {}" : ""}, logOptions = undefined) {
    return profileUserFunc($program, $props, args, logOptions)
}`)
    }
}
