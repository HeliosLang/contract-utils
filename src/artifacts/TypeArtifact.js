import { collectBuiltinTypes, genTypes } from "../codegen/TypeSchema.js"
import { ChildArtifactWriter } from "./ChildArtifactWriter.js"
import { writeFunctionArtifact } from "./FunctionArtifact.js"

/**
 * @import { TypeSchema } from "@helios-lang/type-utils"
 * @import { Artifact } from "./Artifact.js"
 * @import { FunctionDetails, TypeDetails } from "./symbols.js"
 */

/**
 *
 * @param {Artifact} parent
 * @param {string} name
 * @param {TypeDetails} props
 * @param {Record<string, FunctionDetails>} members
 */
export function writeTypeArtifact(parent, name, props, members) {
    const artifact = new TypeArtifact(parent, name)

    const schema = props.schema

    artifact.writeSchema(schema)
    artifact.writeType(schema)
    artifact.writeConverters()

    for (let memberName in members) {
        writeFunctionArtifact(artifact, memberName, members[memberName])
    }

    // also write enum members
    if (schema.kind == "enum") {
        for (let variant of schema.variantTypes) {
            writeTypeArtifact(artifact, variant.name, { schema: variant }, {})
        }
    }

    artifact.save()

    parent.writeAggregateExport(name)
}

class TypeArtifact extends ChildArtifactWriter {
    /**
     * @param {Artifact} parent
     * @param {string} name
     */
    constructor(parent, name) {
        super(parent, name)
    }

    /**
     * @param {TypeSchema} schema
     */
    writeSchema(schema) {
        this.addImport("TypeSchema", "@helios-lang/type-utils", true)

        this.writeDeclLine(`export const $schema: TypeSchema`)
        this.writeDefLine(
            `/**
 * @type {import("@helios-lang/type-utils").TypeSchema}
 */
export const $schema = ${JSON.stringify(schema, undefined, 4)}`
        )
    }

    /**
     * @param {TypeSchema} schema
     */
    writeType(schema) {
        const types = genTypes(schema)

        this.writeDeclLine(`export type $StrictType = ${types[0]}`)
        this.writeDeclLine(`export type $PermissiveType = ${types[1]}`)

        const internalTypes = collectBuiltinTypes(schema)

        Array.from(internalTypes.entries()).forEach(([name, from]) => {
            this.addImport(name, from, true)
        })
    }

    writeConverters() {
        this.addImport("convertToUplcData", "@helios-lang/contract-utils")
        this.addImport("convertFromUplcData", "@helios-lang/contract-utils")
        this.addImport("UplcData", "@helios-lang/uplc", true)

        this.writeDeclLine(
            `export function $toUplcData(x: $PermissiveType): UplcData`
        )
        this.writeDeclLine(
            `export function $fromUplcData(data: UplcData): $StrictType`
        )

        this.writeDefLine(`export function $toUplcData(x) {
    return convertToUplcData($schema, x)
}`)
        this.writeDefLine(`export function $fromUplcData(data) {
    return convertFromUplcData($schema, data, {
        isMainnet: ${this.isMainnet}
    })
}`)
    }
}
