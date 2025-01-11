import { ArtifactWriter } from "./ArtifactWriter.js"
import { ChildArtifactWriter } from "./ChildArtifactWriter.js"
import { writeFunctionArtifact } from "./FunctionArtifact.js"
import { writeTypeArtifact } from "./TypeArtifact.js"

/**
 * @import { FunctionDetails, ModuleSymbols, TypeDetails } from "./symbols.js"
 */

/**
 * Re-export Artifact to avoid issues with typescript private symbol errors
 * @typedef {import("./Artifact.js").Artifact} Artifact
 */

/**
 * @param {Artifact} parent
 * @param {string} name
 * @param {ModuleSymbols} symbols
 */
export function writeModuleArtifact(parent, name, symbols) {
    const artifact = new ModuleArtifact(parent, name)

    artifact.writeSymbols(symbols)

    artifact.save()

    parent.writeAggregateExport(name)
}

/**
 * @implements {Artifact}
 */
export class ModuleArtifact extends ChildArtifactWriter {
    /**
     * @param {Artifact} parent
     * @param {string} name
     */
    constructor(parent, name) {
        super(parent, name)
    }

    /**
     * @param {ModuleSymbols} symbols
     */
    writeSymbols(symbols) {
        for (let symbolName in symbols) {
            if (symbolName.startsWith("$") || symbolName.includes("::")) {
                continue
            }

            // either function or type
            const symbolDetails = symbols[symbolName]

            console.log(symbolName)
            if ("schema" in symbolDetails) {
                // collect members
                const members = /** @type {Record<string, FunctionDetails>} */ (
                    Object.fromEntries(
                        Object.entries(symbols)
                            .filter(([key, value]) => {
                                return (
                                    key.startsWith(`${symbolName}::`) &&
                                    value["kind"] != "Cast"
                                )
                            })
                            .map(([key, value]) => [
                                key.slice(`${symbolName}::`.length),
                                value
                            ])
                    )
                )

                writeTypeArtifact(this, symbolName, symbolDetails, members)
            } else {
                writeFunctionArtifact(
                    this,
                    symbolName,
                    /** @type {FunctionDetails} */ (symbolDetails)
                )
            }
        }
    }
}
