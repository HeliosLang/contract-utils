import { genTypes } from "../codegen/TypeSchema.js"
import { ModuleArtifact } from "./ModuleArtifact.js"

/**
 * @import { MintingContext, ScriptHash, SpendingContext, StakingContext } from "@helios-lang/ledger"
 * @import { Cast } from "../index.js"
 * @import { Artifact } from "./Artifact.js"
 * @import { ModuleSymbols } from "./symbols.js"
 */

/**
 * @param {Artifact} parent
 * @param {string} name
 * @param {ScriptHash} hash
 * @param {ModuleSymbols} symbols
 */
export function writeValidatorArtifact(parent, name, hash, symbols) {
    const artifact = new ValdiatorArtifact(parent, name)

    artifact.writeHash(hash)

    artifact.writeSymbols(symbols)

    artifact.save()

    parent.writeAggregateExport(name)
}

/**
 * @implements {Artifact}
 */
class ValdiatorArtifact extends ModuleArtifact {
    /**
     * @param {Artifact} parent
     * @param {string} name
     */
    constructor(parent, name) {
        super(parent, name)
    }

    /**
     * @param {ScriptHash} hash
     */
    writeHash(hash) {
        // TODO: SpendingContext, MintingContext, StakingContext
        if (hash.kind == "MintingPolicyHash") {
            this.addImport(
                "MintingPolicyHash",
                "@helios-lang/ledger",
                true
            ).addImport("makeMintingPolicyHash", "@helios-lang/ledger")

            if (!hash.context) {
                this.writeDeclLine(
                    `export const $hash: MintingPolicyHash`
                ).writeDefLine(
                    `export const $hash = makeMintingPolicyHash("${hash.toHex()}")`
                )
            } else {
                this.addImport("makeCast", "@helios-lang/contract-utils")
                this.addImport("MintingContext", "@helios-lang/ledger", true)

                const context =
                    /** @type {MintingContext<unknown, unknown>} */ (
                        hash.context
                    )
                const program = context.program
                const redeemer = /** @type {Cast<unknown, unknown>} */ (
                    context.redeemer
                )
                const types = genTypes(redeemer.schema)

                this.writeProgram("$program", program).writeDeclLine(
                    `export const $hash: MintingPolicyHash<MintingContext<${types[0]}, ${types[1]}>>`
                )
                    .writeDefLine(`export const $hash = makeMintingPolicyHash("${hash.toHex()}", {
    program: $program,
    redeemer: makeCast(${JSON.stringify(redeemer.schema, undefined, 4).split("\n").join("\n    ")}, {isMainnet: ${this.isMainnet}})
})`)
            }
        } else if (hash.kind == "StakingValidatorHash") {
            this.addImport(
                "StakingValidatorHash",
                "@helios-lang/ledger",
                true
            ).addImport("makeStakingValidatorHash", "@helios-lang/ledger")

            if (!hash.context) {
                this.writeDeclLine(
                    `export const $hash: StakingValidatorHash`
                ).writeDefLine(
                    `export const $hash = makeStakingValidatorHash("${hash.toHex()}")`
                )
            } else {
                this.addImport("makeCast", "@helios-lang/contract-utils")
                this.addImport("StakingContext", "@helios-lang/ledger", true)

                const context =
                    /** @type {StakingContext<unknown, unknown>} */ (
                        hash.context
                    )
                const program = context.program
                const redeemer = /** @type {Cast<unknown, unknown>} */ (
                    context.redeemer
                )
                const types = genTypes(redeemer.schema)

                this.writeProgram("$program", program).writeDeclLine(
                    `export const $hash: StakingValidatorHash<StakingContext<${types[0]}, ${types[1]}>>`
                )
                    .writeDefLine(`export const $hash = makeStakingValidatorHash("${hash.toHex()}", {
    program: $program,
    redeemer: makeCast(${JSON.stringify(redeemer.schema, undefined, 4).split("\n").join("\n    ")}, {isMainnet: ${this.isMainnet}})
})`)
            }
        } else if (hash.kind == "ValidatorHash") {
            this.addImport(
                "ValidatorHash",
                "@helios-lang/ledger",
                true
            ).addImport("makeValidatorHash", "@helios-lang/ledger")

            if (!hash.context) {
                this.writeDeclLine(
                    `export const $hash: ValidatorHash`
                ).writeDefLine(
                    `export const $hash = makeValidatorHash("${hash.toHex()}")`
                )
            } else {
                this.addImport("makeCast", "@helios-lang/contract-utils")
                this.addImport("SpendingContext", "@helios-lang/ledger", true)

                const context =
                    /** @type {SpendingContext<unknown, unknown, unknown, unknown>} */ (
                        hash.context
                    )
                const program = context.program
                const datum = /** @type {Cast<unknown, unknown>} */ (
                    context.datum
                )
                const redeemer = /** @type {Cast<unknown, unknown>} */ (
                    context.redeemer
                )
                const dTypes = genTypes(datum.schema)
                const rTypes = genTypes(redeemer.schema)

                this.writeProgram("$program", program).writeDeclLine(
                    `export const $hash: ValidatorHash<SpendingContext<${dTypes[0]}, ${dTypes[1]}, ${rTypes[0]}, ${rTypes[1]}>>`
                )
                    .writeDefLine(`export const $hash = makeValidatorHash("${hash.toHex()}", {
    program: $program,
    datum: makeCast(${JSON.stringify(datum.schema, undefined, 4).split("\n").join("\n    ")}, {isMainnet: ${this.isMainnet}}),
    redeemer: makeCast(${JSON.stringify(redeemer.schema, undefined, 4).split("\n").join("\n    ")}, {isMainnet: ${this.isMainnet}})
})`)
            }
        }
    }
}
