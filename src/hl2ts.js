#!/usr/bin/env node

import { promises, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { readHeader, translateImportPaths } from "@helios-lang/compiler-utils"
import { LoadedScriptsWriter } from "./codegen/index.js"
import { loadCompilerLib } from "./compiler/index.js"
import { typeCheckFiles, typeCheckScripts } from "./compiler/ops.js"

/**
 * @typedef {import("./compiler/CompilerLib.js").CompilerLib} CompilerLib
 * @typedef {import("./compiler/CompilerLib.js").TypeCheckedModule} ModuleDetails
 * @typedef {import("./compiler/CompilerLib.js").TypeCheckedValidator} ValidatorDetails
 */

/**
 * @typedef {{
 *   name: string
 *   purpose: string
 *   sourceCode: string
 * }} SourceDetails
 */

async function main() {
    const lib = loadCompilerLib()

    const { outDir } = parseArgs(process.argv)

    const filePaths = await listFiles(process.cwd(), ".hl")
    const files = readFiles(filePaths)

    console.log(`hl2ts using Helios compiler v${lib.version}`)
    console.log(`  Transpiling ${Object.keys(files).length} inputs:`)
    filePaths.forEach((p) => console.log(`    ${p}`))

    const { modules, validators } = typeCheckFiles(lib, files, (current, rel) =>
        resolve(join(dirname(current), rel))
    )

    const [js, dts] = LoadedScriptsWriter.new()
        .writeModules(modules)
        .writeValidators(validators)
        .finalize()

    const jsPath = join(outDir, "index.js")
    const dtsPath = join(outDir, "index.d.ts")

    writeFileSync(jsPath, js)
    writeFileSync(dtsPath, dts)

    console.log(`  Output:`)
    console.log(`    ${jsPath}`)
    console.log(`    ${dtsPath}`)
}

main()

/**
 * @param {string[]} args
 * @returns {{outDir: string}}
 */
function parseArgs(args) {
    let i = args.indexOf("-o")
    if (i != -1) {
        if (i == args.length - 1) {
            throw new Error("expected argument after -o")
        }

        return { outDir: resolve(args[i + 1]) }
    } else {
        return { outDir: process.cwd() }
    }
}

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
 * @returns {string[]}
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

            const d = partialSources[absPath] ?? partialSources[absPath + ".hl"]

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

    return Object.values(sources).map((s) => s.sourceCode)
}
