import { StringWriter } from "@helios-lang/codec-utils"
import { genTypes } from "./TypeSchema.js"

/**
 * @typedef {import("./TypeCheckedModule.js").TypeCheckedModule} TypeCheckedModule
 * @typedef {import("./TypeCheckedValidator.js").TypeCheckedValidator} TypeCheckedValidator
 * @typedef {import("./TypeSchema.js").TypeSchema} TypeSchema
 */

export class LoadedScriptsWriter {
    /**
     * @private
     */
    constructor() {
        this.definition = new StringWriter()
        this.declaration = new StringWriter()
        this.combined = new StringWriter()
    }

    /**
     * Constructs a LoadedScriptsWriter instance and initializes it be writing the header
     * @returns {LoadedScriptsWriter}
     */
    static new() {
        const w = new LoadedScriptsWriter()

        w.writeHeaders()

        return w
    }

    /**
     * @param {{[name: string]: TypeCheckedModule}} ms
     * @returns {LoadedScriptsWriter}
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

        return this
    }

    /**
     * @param {{[name: string]: TypeCheckedValidator}} validators
     * @returns {LoadedScriptsWriter}
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

        return this
    }

    /**
     * @returns {[string, string, string]}
     */
    finalize() {
        return [
            this.definition.finalize(),
            this.declaration.finalize(),
            this.combined.finalize()
        ]
    }

    /**
     * @private
     * @param {string} def
     * @param {string} decl
     * @returns {LoadedScriptsWriter}
     */
    write(def, decl = "") {
        this.definition.write(def)
        this.declaration.write(decl)

        return this
    }

    /**
     * @private
     */
    writeHeaders() {
        this.definition.writeLine(
            'import { Cast } from "@helios-lang/contract-utils";'
        )
        ;[this.declaration, this.combined].forEach((w) => {
            w.writeLine('import type {UplcData} from "@helios-lang/ledger";')
            w.writeLine(
                'import { Address, AssetClass, DatumHash, MintingPolicyHash, PubKey, PubKeyHash, SpendingCredential, StakingCredential, StakingHash, StakingValidatorHash, TimeRange, TxId, TxOutputDatum, ValidatorHash, Value } from "@helios-lang/ledger";'
            )
            w.writeLine('import { Cast } from "@helios-lang/contract-utils";')
        })
    }

    /**
     *
     * @param {Record<string, TypeSchema>} types
     */
    writeTypes(types) {
        for (let key in types) {
            const t = types[key]
            const tsTypes = genTypes(t)

            this.definition.write(
                `    ${key}: new Cast(${JSON.stringify(t)}),\n`
            )
            this.declaration.write(
                `    ${key}: Cast<${tsTypes[0]}, ${tsTypes[1]}>,\n`
            )
            this.combined.write(
                `    ${key}: new Cast<${tsTypes[0]}, ${tsTypes[1]}>(${JSON.stringify(t)}),\n`
            )
        }
    }

    /**
     * @private
     * @param {TypeCheckedModule} m
     */
    writeModule(m) {
        this.definition.write(`export const ${m.name} = {
    $name: "${m.name}",
    $purpose: "${m.purpose}",
    $sourceCode: ${JSON.stringify(m.sourceCode)},
    $dependencies: [${m.moduleDepedencies.join(", ")}],\n`)

        this.declaration.write(
            `export const ${m.name}: {
    $name: "${m.name}"
    $purpose: "${m.purpose}"
    $sourceCode: string
    $dependencies: [${m.moduleDepedencies.map((d) => `typeof ${d}`).join(", ")}],\n`
        )

        this.combined.write(
            `export const ${m.name} = {
    $name: "${m.name}" as const,
    $purpose: "${m.purpose}" as const,
    $sourceCode: ${JSON.stringify(m.sourceCode)} as string,
    $dependencies: [${m.moduleDepedencies.join(", ")}],\n`
        )

        this.writeTypes(m.types)

        this.definition.write(`}\n`)
        this.declaration.write(`}\n`)
        this.combined.write(`}\n`)
    }

    /**
     * @private
     * @param {TypeCheckedValidator} v
     */
    writeValidator(v) {
        const redeemerTypes = genTypes(v.Redeemer)
        const datumTypes = v.Datum ? genTypes(v.Datum) : undefined

        this.definition.write(
            `export const ${v.name} = {
    $name: "${v.name}",
    $purpose: "${v.purpose}",
    $sourceCode: ${JSON.stringify(v.sourceCode)},
    $dependencies: [${v.moduleDepedencies.join(", ")}],
    $hashDependencies: [${v.hashDependencies.filter((d) => d != v.name).join(", ")}],
    $dependsOnOwnHash: ${v.hashDependencies.some((d) => d == v.name)},
    $Redeemer: new Cast(${JSON.stringify(v.Redeemer)}),
${datumTypes ? `    $Datum: new Cast(${JSON.stringify(v.Datum)}),\n` : ""}`
        )

        this.declaration.write(
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
${datumTypes ? `    $Datum: Cast<${datumTypes[0]}, ${datumTypes[1]}>,\n` : ""}`
        )

        this.combined.write(
            `export const ${v.name} = {
    $name: "${v.name}" as const,
    $purpose: "${v.purpose}" as const,
    $sourceCode: ${JSON.stringify(v.sourceCode)} as string,
    $dependencies: [${v.moduleDepedencies.join(", ")}],
    $hashDependencies: [${v.hashDependencies.filter((d) => d != v.name).join(", ")}],
    $dependsOnOwnHash: ${v.hashDependencies.some((d) => d == v.name)} as boolean,
    $Redeemer: new Cast<${redeemerTypes[0]}, ${redeemerTypes[1]}>(${JSON.stringify(v.Redeemer)}),
${datumTypes ? `    $Datum: new Cast<${datumTypes[0]}, ${datumTypes[1]}>(${JSON.stringify(v.Datum)}),\n` : ""}`
        )

        this.writeTypes(v.types)

        this.definition.write(`}\n`)
        this.declaration.write(`}\n`)
        this.combined.write(`}\n`)
    }
}
