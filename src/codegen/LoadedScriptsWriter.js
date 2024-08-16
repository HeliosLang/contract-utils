import { StringWriter } from "@helios-lang/codec-utils"
import { genTypes } from "./TypeSchema.js"

/**
 * @typedef {import("./TypeCheckedModule.js").TypeCheckedModule} TypeCheckedModule
 * @typedef {import("./TypeCheckedModule.js").TypeCheckedUserFunc} TypeCheckedUserFunc
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
     * @param {string} path
     * @param {string} typeName
     * @param {string[]} typeParams
     * @returns {LoadedScriptsWriter}
     */
    writeImportType(path, typeName, typeParams = []) {
        this.definition.writeLine("/**")

        for (let tp of typeParams) {
            this.definition.writeLine(` * @template ${tp}`)
        }

        this.definition
            .writeLine(
                ` * @typedef {import("${path}").${typeName}${typeParams.length > 0 ? `<${typeParams.join(", ")}>` : ""}} ${typeName}`
            )
            .writeLine(" */")
        ;[this.declaration, this.combined].forEach((w) => {
            w.writeLine(`import type { ${typeName} } from "${path}";`)
        })

        return this
    }

    /**
     * @param {string} path
     * @param {string[]} objectNames
     * @returns {LoadedScriptsWriter}
     */
    writeImport(path, ...objectNames) {
        ;[this.definition, this.declaration, this.combined].forEach((w) => {
            w.writeLine(`import { ${objectNames.join(", ")} } from "${path}";`)
        })

        return this
    }

    /**
     * @private
     */
    writeHeaders() {
        this.writeImport("@helios-lang/contract-utils", "Cast", "UserFunc")
        this.writeImport(
            "@helios-lang/ledger",
            "Address",
            "AssetClass",
            "DatumHash",
            "MintingPolicyHash",
            "PubKey",
            "PubKeyHash",
            "SpendingCredential",
            "StakingCredential",
            "StakingHash",
            "StakingValidatorHash",
            "TimeRange",
            "TxId",
            "TxOutputDatum",
            "ValidatorHash",
            "Value"
        )
        this.writeImportType("@helios-lang/codec-utils", "IntLike")
        this.writeImportType("@helios-lang/contract-utils", "CastConfig")
        this.writeImportType(
            "@helios-lang/contract-utils",
            "ConfigurableCast",
            ["TStrict", "TPermissive"]
        )
        this.writeImportType("@helios-lang/ledger", "TimeLike")
        this.writeImportType("@helios-lang/ledger", "UplcData")
    }

    /**
     * @param {Record<string, TypeSchema>} types
     */
    writeTypes(types) {
        ;[this.definition, this.declaration, this.combined].forEach((w) =>
            w.write("    $types: {\n")
        )

        for (let key in types) {
            const t = types[key]
            const tsTypes = genTypes(t)

            this.definition.write(
                `        ${key}: (config) => /** @type {Cast<${tsTypes[0]}, ${tsTypes[1]}>} */ (new Cast(${JSON.stringify(t)}, config)),\n`
            )
            this.declaration.write(
                `        ${key}: ConfigurableCast<${tsTypes[0]}, ${tsTypes[1]}>,\n`
            )
            this.combined.write(
                `        ${key}: (config: CastConfig) => new Cast<${tsTypes[0]}, ${tsTypes[1]}>(${JSON.stringify(t)}, config),\n`
            )
        }

        ;[this.definition, this.declaration, this.combined].forEach((w) =>
            w.write("    },\n")
        )
    }

    /**
     * @param {Record<string, TypeCheckedUserFunc>} functions
     */
    writeFunctions(functions) {
        ;[this.definition, this.declaration, this.combined].forEach((w) =>
            w.write("    $functions: {\n")
        )

        for (let key in functions) {
            const fn = functions[key]
            const t = genFuncType(fn)

            this.definition.write(
                `        ${key}: /** @type {UserFunc<${t}>} */ (new UserFunc(${JSON.stringify(fn)})),\n`
            )
            this.declaration.write(`        ${key}: UserFunc<${t}>,\n`)
            this.combined.write(
                `        ${key}: new UserFunc<${t}>(${JSON.stringify(fn)}),\n`
            )
        }

        ;[this.definition, this.declaration, this.combined].forEach((w) =>
            w.write("    },\n")
        )
    }

    /**
     * @private
     * @param {TypeCheckedModule} m
     */
    writeModule(m) {
        this.definition.write(`export const ${m.name} = {
    $name: /** @type {const} */ ("${m.name}"),
    $purpose: /** @type {const} */ ("${m.purpose}"),
    $sourceCode: ${JSON.stringify(m.sourceCode)},
    $dependencies: /** @type {const} */ ([${m.moduleDepedencies.join(", ")}]),\n`)

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
    $dependencies: [${m.moduleDepedencies.join(", ")}] as const,\n`
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
    $name: /** @type {const} */ ("${v.name}"),
    $purpose: /** @type {const} */ ("${v.purpose}"),
    $sourceCode: ${JSON.stringify(v.sourceCode)},
    $dependencies: /** @type {const} */ ([${v.moduleDepedencies.join(", ")}]),
    $hashDependencies: [${v.hashDependencies.filter((d) => d != v.name).join(", ")}],
    $dependsOnOwnHash: ${v.hashDependencies.some((d) => d == v.name)},
    $Redeemer: (config) => /** @type {Cast<${redeemerTypes[0]}, ${redeemerTypes[1]}>} */ (new Cast(${JSON.stringify(v.Redeemer)}, config)),
${datumTypes ? `    $Datum: (config) => /** @type {Cast<${datumTypes[0]}, ${datumTypes[1]}>} */ (new Cast(${JSON.stringify(v.Datum)}, config)),\n` : ""}`
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
    $Redeemer: ConfigurableCast<${redeemerTypes[0]}, ${redeemerTypes[1]}>
${datumTypes ? `    $Datum: ConfigurableCast<${datumTypes[0]}, ${datumTypes[1]}>,\n` : ""}`
        )

        this.combined.write(
            `export const ${v.name} = {
    $name: "${v.name}" as const,
    $purpose: "${v.purpose}" as const,
    $sourceCode: ${JSON.stringify(v.sourceCode)} as string,
    $dependencies: [${v.moduleDepedencies.join(", ")}] as const,
    $hashDependencies: [${v.hashDependencies.filter((d) => d != v.name).join(", ")}],
    $dependsOnOwnHash: ${v.hashDependencies.some((d) => d == v.name)} as boolean,
    $Redeemer: (config: CastConfig) => new Cast<${redeemerTypes[0]}, ${redeemerTypes[1]}>(${JSON.stringify(v.Redeemer)}, config),
${datumTypes ? `    $Datum: (config: CastConfig) => new Cast<${datumTypes[0]}, ${datumTypes[1]}>(${JSON.stringify(v.Datum)}, config),\n` : ""}`
        )

        this.writeTypes(v.types)
        if (v.functions) {
            this.writeFunctions(v.functions)
        }

        this.definition.write(`}\n`)
        this.declaration.write(`}\n`)
        this.combined.write(`}\n`)
    }
}

/**
 * @param {TypeCheckedUserFunc} fn
 * @returns {string}
 */
function genFuncType(fn) {
    /**
     * @type {string[]}
     */
    const fields = []

    if (fn.requiresScriptContext) {
        fields.push("$scriptContext: UplcData")
    }

    if (fn.requiresCurrentScript) {
        fields.push("$currentScript: string")
    }

    fn.arguments.forEach(({ name, type: _type }) => {
        fields.push(`${name}: UplcData`)
    })

    return `({${fields.join(", ")}}) => UplcData`
}
