import { StringWriter } from "@helios-lang/codec-utils"
import { genTypes } from "./TypeSchema.js"

/**
 * @typedef {import("./TypeCheckedModule.js").TypeCheckedModule} TypeCheckedModule
 * @typedef {import("./TypeCheckedValidator.js").TypeCheckedValidator} TypeCheckedValidator
 */

export class LoadedScriptsWriter {
    constructor() {
        this.definition = new StringWriter()
        this.declaration = new StringWriter()
    }

    /**
     * @param {string} def
     * @param {string} decl
     * @returns {LoadedScriptsWriter}
     */
    write(def, decl = "") {
        this.definition.write(def)
        this.declaration.write(decl)

        return this
    }

    writeHeaders() {
        this.definition.writeLine(
            'import { Cast } from "@helios-lang/contract-utils";'
        )

        this.declaration.writeLine(
            'import type {UplcData} from "@helios-lang/ledger";'
        )
        this.declaration.writeLine(
            'import { Address, AssetClass, Credential, DatumHash, MintingPolicyHash, PubKeyHash, StakingCredential, StakingHash, StakingValidatorHash, TimeRange, TxId, TxOutputDatum, ValidatorHash, Value} from "@helios-lang/ledger";'
        )
        this.declaration.writeLine(
            'import { Cast } from "@helios-lang/contract-utils";'
        )
    }

    /**
     * @param {string} def
     * @param {string} decl
     * @returns {LoadedScriptsWriter}
     */
    writeLine(def, decl = "") {
        if (def != "") {
            this.definition.writeLine(def)
        }

        if (decl != "") {
            this.declaration.writeLine(decl)
        }

        return this
    }

    /**
     * @param {TypeCheckedModule} m
     */
    writeModule(m) {
        this.write(
            `export const ${m.name} = {
    $name: "${m.name}",
    $purpose: "${m.purpose}",
    $sourceCode: ${JSON.stringify(m.sourceCode)},
    $dependencies: [${m.moduleDepedencies.join(", ")}],
}
`,
            `export const ${m.name}: {
    $name: string
    $purpose: string
    $sourceCode: string
    $dependencies: [${m.moduleDepedencies.map((d) => `typeof ${d}`).join(", ")}]
}
`
        )
    }

    /**
     * @param {TypeCheckedValidator} v
     */
    writeValidator(v) {
        const redeemerTypes = genTypes(v.Redeemer)
        const datumTypes = v.Datum ? genTypes(v.Datum) : undefined

        this.write(
            `export const ${v.name} = {
    $name: "${v.name}",
    $purpose: "${v.purpose}",
    $sourceCode: ${JSON.stringify(v.sourceCode)},
    $dependencies: [${v.moduleDepedencies.join(", ")}],
    $hashDependencies: [${v.hashDependencies.filter((d) => d != v.name).join(", ")}],
    $dependsOnOwnHash: ${v.hashDependencies.some((d) => d == v.name)},
    $Redeemer: new Cast(${JSON.stringify(v.Redeemer)}),
    ${datumTypes ? `$Datum: new Cast(${JSON.stringify(v.Datum)})` : ""}
}
`,
            `export const ${v.name}: {
    $name: "${v.name}"
    $purpose: "${v.purpose}"
    $sourceCode: string
    $dependencies: [${v.moduleDepedencies.map((d) => `typeof ${d}`).join(", ")}]
    $hashDependencies: [${v.hashDependencies
        .filter((d) => d != v.name)
        .map((d) => `typeof ${d}`)
        .join(", ")}]
    $dependsOnOwnHash: boolean
    $Redeemer: Cast<${redeemerTypes[0]}, ${redeemerTypes[1]}>
    ${datumTypes ? `$Datum: Cast<${datumTypes[0]}, ${datumTypes[1]}>` : ""}
}
`
        )
    }

    /**
     * @param {{[name: string]: TypeCheckedModule}} ms
     */
    writeModules(ms) {
        /**
         * @type {Set<string>}
         */
        const done = new Set()

        let todo = Object.values(ms)

        while (todo.length > 0) {
            /**
             * @type {TypeCheckedModule[]}
             */
            let todoNext = []

            for (let i = 0; i < todo.length; i++) {
                const m = todo[i]

                if (m.moduleDepedencies.every((d) => done.has(d))) {
                    this.writeModule(m)

                    done.add(m.name)
                } else {
                    todoNext.push(m)
                }
            }

            todo = todoNext
        }
    }

    /**
     *
     * @param {{[name: string]: TypeCheckedValidator}} validators
     */
    writeValidators(validators) {
        /**
         * @type {Set<string>}
         */
        const done = new Set()

        let todo = Object.values(validators)

        while (todo.length > 0) {
            /**
             * @type {TypeCheckedValidator[]}
             */
            let todoNext = []

            for (let i = 0; i < todo.length; i++) {
                const v = todo[i]

                if (
                    v.hashDependencies.every((d) => done.has(d) || d == v.name)
                ) {
                    this.writeValidator(v)

                    done.add(v.name)
                } else {
                    todoNext.push(v)
                }
            }

            todo = todoNext
        }
    }

    /**
     * @returns {[string, string]}
     */
    finalize() {
        return [this.definition.finalize(), this.declaration.finalize()]
    }
}
