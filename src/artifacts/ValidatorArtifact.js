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

    artifact.writeSymbols(symbols)

    artifact.writeHash(hash)

    artifact.save()

    parent.writeAggregateExport(name)
}

/**
 * @implements {Artifact}
 */
class ValdiatorArtifact extends ModuleArtifact {
    /**
     * @private
     * @type {boolean}
     */
    hasMainFunction

    /**
     * @param {Artifact} parent
     * @param {string} name
     */
    constructor(parent, name) {
        super(parent, name)
        this.hasMainFunction = false
    }

    /**
     * @param {ScriptHash} hash
     */
    writeHash(hash) {
        this.writeDeclLine(`export const $hashHex: string`)
        this.writeDefLine(`export const $hashHex = "${hash.toHex()}"`)

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
                    `export const $hash = /* @__PURE__ */ makeMintingPolicyHash($hashHex)`
                )
            } else {
                this.writeDeclLine(
                    `export const $hashWithoutContext: MintingPolicyHash`
                ).writeDefLine(
                    `export const $hashWithoutContext = /* @__PURE__ */ makeMintingPolicyHash($hashHex)`
                )

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

                this.writeProgram("$program", program, !this.hasMainFunction)

                this.writeDeclLine(
                    `export type $ContextType = MintingContext<${types[0]}, ${types[1]}>`
                ).writeDeclLine(
                    `export const $hash: MintingPolicyHash<$ContextType>`
                )
                    .writeDefLine(`export const $hash = /* @__PURE__ */ makeMintingPolicyHash($hashHex, {
    program: $program,
    redeemer: /* @__PURE__*/ makeCast(${JSON.stringify(redeemer.schema, undefined, 4).split("\n").join("\n    ")}, {isMainnet: ${this.isMainnet}})
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
                    `export const $hash = /* @__PURE__*/ makeStakingValidatorHash($hashHex)`
                )
            } else {
                this.writeDeclLine(
                    `export const $hashWithoutContext: StakingValidatorHash`
                ).writeDefLine(
                    `export const $hashWithoutContext = /* @__PURE__*/ makeStakingValidatorHash($hashHex)`
                )

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

                this.writeProgram("$program", program, !this.hasMainFunction)

                this.writeDeclLine(
                    `export type $ContextType = StakingContext<${types[0]}, ${types[1]}>`
                ).writeDeclLine(
                    `export const $hash: StakingValidatorHash<$ContextType>`
                )
                    .writeDefLine(`export const $hash = /* @__PURE__*/ makeStakingValidatorHash($hashHex, {
    program: $program,
    redeemer: /* @__PURE__ */ makeCast(${JSON.stringify(redeemer.schema, undefined, 4).split("\n").join("\n    ")}, {isMainnet: ${this.isMainnet}})
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
                    `export const $hash = /* @__PURE__ */ makeValidatorHash($hashHex)`
                )
            } else {
                this.writeDeclLine(
                    `export const $hashWithoutContext: ValidatorHash`
                ).writeDefLine(
                    `export const $hashWithoutContext = /* @__PURE__ */ makeValidatorHash($hashHex)`
                )

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

                this.writeProgram("$program", program, !this.hasMainFunction)

                this.writeDeclLine(
                    `export type $ContextType = SpendingContext<${dTypes[0]}, ${dTypes[1]}, ${rTypes[0]}, ${rTypes[1]}>`
                )
                    .writeDeclLine(
                        `export const $hash: ValidatorHash<$ContextType>`
                    )
                    .writeDefLine(
                        `export const $hash = /* @__PURE__ */ makeValidatorHash($hashHex, {
    program: $program,
    datum: /* @__PURE__ */ makeCast(${JSON.stringify(datum.schema, undefined, 4).split("\n").join("\n    ")}, {isMainnet: ${this.isMainnet}}),
    redeemer: /* @__PURE__ */ makeCast(${JSON.stringify(redeemer.schema, undefined, 4).split("\n").join("\n    ")}, {isMainnet: ${this.isMainnet}})
})`
                    )
            }
        }
    }

    /**
     * @param {string} name
     * @returns {ValdiatorArtifact}
     */
    writeAggregateExport(name) {
        super.writeAggregateExport(name)

        if (name == "main") {
            this.writeDefLine(
                `import { $program } from "./${name}/index.js"`
            ).writeDefLine(`export { $program }`)
            this.hasMainFunction = true
        }

        return this
    }
}
