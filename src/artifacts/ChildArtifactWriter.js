import { bytesToHex } from "@helios-lang/codec-utils"
import { makeUplcSourceMap } from "@helios-lang/uplc"
import { ArtifactWriter } from "./ArtifactWriter.js"

/**
 * @import { UplcProgram } from "@helios-lang/uplc"
 * @import { Artifact } from "./Artifact.js"
 */

export class ChildArtifactWriter extends ArtifactWriter {
    /**
     * @readonly
     * @type {Artifact}
     */
    parent

    /**
     * @readonly
     * @type {string}
     */
    name

    /**
     * @param {Artifact} parent
     * @param {string} name
     */
    constructor(parent, name) {
        super(parent.fs, `${parent.dir}/${name}`)

        this.parent = parent
        this.name = name
    }

    /**
     * @type {boolean}
     */
    get isMainnet() {
        return this.parent.isMainnet
    }

    /**
     * @param {string} name
     * @param {UplcProgram} program
     * @param {boolean} includeDef
     * @returns {ChildArtifactWriter}
     */
    writeProgram(name, program, includeDef) {
        this.writeDeclLine(`export const $programCborHex: string`)

        if (includeDef) {
            this.writeDefLine(
                `export const $programCborHex = "${bytesToHex(program.toCbor())}"`
            )
        }

        if (program.plutusVersion == "PlutusScriptV1") {
            this.addImport("UplcProgramV1", "@helios-lang/uplc", true)
            this.writeDeclLine(`export const ${name}: UplcProgramV1`)

            if (includeDef) {
                this.addImport(
                    "decodeUplcProgramV1FromCbor",
                    "@helios-lang/uplc"
                )
                this.writeDefLine(
                    `export const ${name} = ${stringifyProgram("decodeUplcProgramV1FromCbor", program)}`
                )
            }
        } else if (program.plutusVersion == "PlutusScriptV2") {
            this.addImport("UplcProgramV2", "@helios-lang/uplc", true)
            this.writeDeclLine(`export const ${name}: UplcProgramV2`)

            if (includeDef) {
                this.addImport(
                    "decodeUplcProgramV2FromCbor",
                    "@helios-lang/uplc"
                )
                this.writeDefLine(
                    `export const ${name} = ${stringifyProgram("decodeUplcProgramV2FromCbor", program)}`
                )
            }
        } else if (program.plutusVersion == "PlutusScriptV3") {
            this.addImport("UplcProgramV3", "@helios-lang/uplc", true)
            this.writeDeclLine(`export const ${name}: UplcProgramV3`)

            if (includeDef) {
                this.addImport(
                    "decodeUplcProgramV3FromCbor",
                    "@helios-lang/uplc"
                )
                this.writeDefLine(
                    `export const ${name} = ${stringifyProgram("decodeUplcProgramV3FromCbor", program)}`
                )
            }
        } else {
            throw new Error("unhandled Plutus version")
        }

        return this
    }
}

/**
 *
 * @param {string} decoderName
 * @param {UplcProgram} program
 * @returns {string}
 */
function stringifyProgram(decoderName, program) {
    const sourceMap = makeUplcSourceMap({ term: program.root })

    return `/* @__PURE__ */ ${decoderName}(
    $programCborHex,
    {${stringifyAlt("decodeUplcProgramV2FromCbor", program.alt)}
        sourceMap: ${JSON.stringify(sourceMap.toJsonSafe(), undefined, 4).split("\n").join("\n        ")}
    }
)`
}

/**
 * @param {string} decoderName
 * @param {UplcProgram |  undefined} alt
 * @returns {string}
 */
function stringifyAlt(decoderName, alt) {
    if (!alt) {
        return ""
    }

    const sourceMap = makeUplcSourceMap({ term: alt.root })

    return `
        alt: /* @__PURE__ */ ${decoderName}(
            "${bytesToHex(alt.toCbor())}",
            {
                sourceMap: ${JSON.stringify(sourceMap.toJsonSafe(), undefined, 4).split("\n").join("\n                ")}
            }
        ),`
}
