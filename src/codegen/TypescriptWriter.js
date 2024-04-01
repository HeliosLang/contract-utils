import { genTypes } from "./TypeSchema.js"
import { Writer } from "./Writer.js"

/**
 * @typedef {import("./Module.js").Module} Module
 * @typedef {import("./Validator.js").Validator} Validator
 */

export class TypescriptWriter {
    constructor() {
        this.wjs = new Writer()
        this.wdts = new Writer()
    }

    /**
     * @param {string} js
     * @param {string} dts
     * @returns {TypescriptWriter}
     */
    write(js, dts = "") {
        this.wjs.write(js)
        this.wdts.write(dts)
        return this
    }

    /**
     * @param {string} js
     * @param {string} dts
     * @returns {TypescriptWriter}
     */
    writeLine(js, dts = "") {
        if (js != "") {
            this.wjs.writeLine(js)
        }

        if (dts != "") {
            this.wdts.writeLine(dts)
        }

        return this
    }

    /**
     * @param {Module} m
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
     * @param {Validator} v
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
    $name: string
    $purpose: string
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

    writeHeaders() {
        this.wjs.writeLine("import { Cast } from \"@helios-lang/contract-utils\";")

        this.wdts.writeLine("import type {UplcData} from \"@helios-lang/ledger\";")
        this.wdts.writeLine("import { Address, AssetClass, Credential, DatumHash, MintingPolicyHash, PubKeyHash, StakingCredential, StakingHash, StakingValidatorHash, TimeRange, TxId, TxOutputDatum, ValidatorHash, Value} from \"@helios-lang/ledger\";")
        this.wdts.writeLine("import { Cast } from \"@helios-lang/contract-utils\";")
    }

    /**
     * @param {{[name: string]: Module}} ms
     */
    writeModules(ms) {
        /**
         * @type {Set<string>}
         */
        const done = new Set()

        let todo = Object.values(ms)

        while (todo.length > 0) {
            /**
             * @type {Module[]}
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
     * @param {{[name: string]: Validator}} validators
     */
    writeValidators(validators) {
        /**
         * @type {Set<string>}
         */
        const done = new Set()

        let todo = Object.values(validators)

        while (todo.length > 0) {
            /**
             * @type {Validator[]}
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
        return [this.wjs.finalize(), this.wdts.finalize()]
    }
}
