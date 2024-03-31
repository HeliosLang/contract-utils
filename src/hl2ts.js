#!/usr/bin/env node

import { promises, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { readHeader, translateImportPaths } from "@helios-lang/compiler-utils"
import { TypescriptWriter } from "./codegen/index.js"
import { loadLibrary } from "./lib/index.js"

/**
 * @typedef {import("./lib/Lib.js").Lib} Lib
 */

/**
 * @typedef {import("./lib/Lib.js").SourceDetails} SourceDetails
 */

/**
 * @typedef {import("./lib/Lib.js").ModuleDetails} ModuleDetails
 */

/**
 * @typedef {import("./lib/Lib.js").ValidatorDetails} ValidatorDetails
 */

async function main() {
    console.log("hl2ts")

    const lib = await loadLibrary()
    const filePaths = await listFiles(process.cwd(), ".hl")
    const files = readFiles(filePaths)
    const sources = preparseFiles(files)
    const { modules, validators } = typeCheck(lib, sources)

    const w = new TypescriptWriter()
    console.log(modules, validators)
    w.writeModules(modules)
    w.writeValidators(validators)
    const [js, dts] = w.finalize()

    console.log(js)
    console.log(dts)
}

main()

/**
 * @param {string} dir
 * @param {string} ext
 * @returns {Promise<string[]>}
 */
async function listFiles(dir, ext) {
    const entries = await promises.readdir(dir, { withFileTypes: true })

    const files = await Promise.all(
        entries.map((entry) => {
            const res = resolve(dir, entry.name)

            if (entry.isDirectory()) {
                if (entry.name.endsWith("node_modules")) {
                    return []
                } else {
                    return listFiles(res, ext)
                }
            } else {
                return res
            }
        })
    )

    return files.flat().filter((name) => name.endsWith(ext))
}

/**
 * @param {string[]} filePaths
 * @returns {{[path: string]: string}}
 */
function readFiles(filePaths) {
    return Object.fromEntries(
        filePaths.map((f) => {
            return [f, readFileSync(f).toString()]
        })
    )
}

/**
 *
 * @param {{[path: string]: string}} files
 * @returns {{[name: string]: SourceDetails}}
 */
function preparseFiles(files) {
    const partialSources = {}

    for (let path in files) {
        const [purpose, name] = readHeader(files[path])

        partialSources[path] = {
            name: name,
            purpose: purpose,
            sourceCode: files[path]
        }
    }

    /**
     * @type {{[name: string]: SourceDetails}}
     */
    const sources = {}

    for (let path in files) {
        const sourceCode = translateImportPaths(files[path], (relPath) => {
            const absPath = resolve(join(dirname(path), relPath))

            const d = partialSources[absPath]

            if (!d) {
                throw new Error(`'${relPath}' not found`)
            }

            return d.name
        })

        sources[partialSources[path].name] = {
            ...partialSources[path],
            sourceCode: sourceCode
        }
    }

    return sources
}

/**
 * @param {{[name: string]: SourceDetails}} sources
 * @returns {[{[name: string]: SourceDetails}, {[name: string]: SourceDetails}]}
 */
function splitValidatorsAndModules(sources) {
    /**
     * @type {{[name: string]: SourceDetails}}
     */
    const validators = {}

    /**
     * @type {{[name: string]: SourceDetails}}
     */
    const modules = {}

    for (let key in sources) {
        const v = sources[key]
        if (v.purpose == "module") {
            modules[key] = v
        } else if (
            v.purpose == "spending" ||
            v.purpose == "minting" ||
            v.purpose == "staking"
        ) {
            validators[key] = v
        }
    }

    return [validators, modules]
}

/**
 * @param {Lib} lib
 * @param {{[name: string]: SourceDetails}} sources
 * @returns {{modules: {[name: string]: ModuleDetails}, validators: {[name: string]: ValidatorDetails}}}
 */
function typeCheck(lib, sources) {
    const [validators, modules] = splitValidatorsAndModules(sources)

    return lib.typeCheck(validators, modules)
}
