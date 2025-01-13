import { makeStringWriter } from "@helios-lang/codec-utils"
import { expectDefined } from "@helios-lang/type-utils"
import { collectBuiltinTypes } from "../codegen/TypeSchema.js"

/**
 * @import { StringWriter } from "@helios-lang/codec-utils"
 * @import { TypeSchema } from "@helios-lang/type-utils"
 * @import { FileSystem } from "../index.js"
 */

export class ArtifactWriter {
    /**
     * @readonly
     * @type {FileSystem}
     */
    fs

    /**
     * @readonly
     * @type {string}
     */
    dir

    /**
     * @private
     * @type {StringWriter}
     */
    decl

    /**
     * @private
     * @type {StringWriter}
     */
    def

    /**
     * @private
     * @type {[string, string, boolean][]}
     */
    imports

    /**
     * @param {FileSystem} fs
     * @param {string} dir
     */
    constructor(fs, dir) {
        this.fs = fs
        this.dir = dir

        this.decl = makeStringWriter()
        this.def = makeStringWriter()
        this.imports = []
    }

    /**
     * @param {string} name
     * @param {string} from
     * @param {boolean} [isType]
     * @returns {ArtifactWriter}
     */
    addImport(name, from, isType = false) {
        this.imports.push([name, from, isType])
        return this
    }

    /**
     * @param {TypeSchema} schema
     */
    collectAndImportTypes(schema) {
        const internalTypes = collectBuiltinTypes(schema)

        Array.from(internalTypes.entries()).forEach(([name, from]) => {
            this.addImport(name, from, true)
        })
    }

    /**
     * @param {string} line
     * @returns {ArtifactWriter}
     */
    writeDeclLine(line) {
        this.decl.writeLine(line)
        return this
    }

    /**
     * @param {string} line
     * @returns {ArtifactWriter}
     */
    writeDefLine(line) {
        this.def.writeLine(line)
        return this
    }

    /**
     * @param {string} name
     * @returns {ArtifactWriter}
     */
    writeAggregateExport(name) {
        return this.writeDeclLine(
            `export * as ${name} from "./${name}/index.js"`
        ).writeDefLine(`export * as ${name} from "./${name}/index.js"`)
    }

    /**
     * Write the .d.ts and .js files to the FS
     */
    save() {
        this.fs.mkdirSync(this.dir, { recursive: true })

        let declString = this.decl.finalize()
        let defString = this.def.finalize()

        if (this.imports.length > 0) {
            const imps = groupImports(this.imports)

            const declImp = makeStringWriter()
            const defImp = makeStringWriter()

            for (let imp of imps) {
                const { from, typeSymbols, defSymbols } = imp

                if (typeSymbols.length == 1) {
                    declImp.writeLine(
                        `import type { ${typeSymbols[0]} } from "${from}"`
                    )
                } else if (typeSymbols.length > 1) {
                    declImp.writeLine(`import type {`)

                    typeSymbols.forEach((s, i) => {
                        declImp.writeLine(
                            `    ${s}${i < typeSymbols.length - 1 ? "," : ""}`
                        )
                    })

                    declImp.writeLine(`} from "${from}"`)
                }

                if (defSymbols.length == 1) {
                    defImp.writeLine(
                        `import { ${defSymbols[0]} } from "${from}"`
                    )
                } else if (defSymbols.length > 1) {
                    defImp.writeLine(`import {`)

                    defSymbols.forEach((s, i) => {
                        defImp.writeLine(
                            `    ${s}${i < defSymbols.length - 1 ? "," : ""}`
                        )
                    })

                    defImp.writeLine(`} from "${from}"`)
                }
            }

            const declImports = declImp.finalize()
            const defImports = defImp.finalize()

            if (declImports.length > 0) {
                declString = `${declImports}\n${declString}`
            }

            if (defImports.length > 0) {
                defString = `${defImports}\n${defString}`
            }
        }

        this.fs.writeFileSync(`${this.dir}/index.d.ts`, declString)
        this.fs.writeFileSync(`${this.dir}/index.js`, defString)
    }
}

/**
 * @param {[string, string, boolean][]} imports
 * @returns {{from: string, typeSymbols: string[], defSymbols: string[]}[]}
 */
function groupImports(imports) {
    /**
     * @type {Map<string, {name: string, isType: boolean}[]>}
     */
    const m = new Map()

    for (let imp of imports) {
        const [name, from, isType] = imp

        const prev = m.get(from)

        if (prev) {
            prev.push({ name, isType })
        } else {
            m.set(from, [{ name, isType }])
        }
    }

    const keys = Array.from(m.keys()).sort()

    return keys.map((key) => {
        const symbols = expectDefined(m.get(key))

        return {
            from: key,
            typeSymbols: symbols
                .filter((symbol) => symbol.isType)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((symbol) => symbol.name),
            defSymbols: symbols
                .filter((symbol) => !symbol.isType)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((symbol) => symbol.name)
        }
    })
}
