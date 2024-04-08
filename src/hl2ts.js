#!/usr/bin/env node

import { existsSync, fstat, promises, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { Cli, Command, EnumOpt, StringOpt } from "@helios-lang/cli-utils"
import { LoadedScriptsWriter } from "./codegen/index.js"
import { loadCompilerLib } from "./compiler/index.js"
import { typeCheckFiles, typeCheckScripts } from "./compiler/ops.js"
import { None } from "@helios-lang/type-utils"

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

   /**
     * @typedef {"javascript" | "typescript"} FormatKind
     */

async function main() {
 

    const cli = new Cli({
        minArgs: 0,
        maxArgs: 0,
        options: {
            outDir: new StringOpt({
                long: "--out-dir",
                short: "-o",
                default: () => process.cwd()
            }),
            format: new EnumOpt({
                long: "--format",
                short: "-f",
                variants: /** @type {FormatKind[]} */ (["javascript", "typescript"]),
                default: () => {
                    const path = findPackageJson()

                    if (path && existsSync(join(dirname(path), "tsconfig.json"))) {
                        return "typescript"
                    } else {
                        return "javascript"
                    }
                }
            })
        },
        action: mainInternal
    })

    await cli.run()
}

/**
 * @param {string[]} _args
 * @param {{outDir: string, format: FormatKind}} options
 * @returns {Promise<void>}
 */
async function mainInternal(_args, {outDir, format}) {
    const lib = loadCompilerLib()

    const filePaths = await listFiles(process.cwd(), ".hl")
    const files = readFiles(filePaths)

    console.log(`hl2ts using Helios compiler v${lib.version}`)
    console.log(`  Transpiling ${Object.keys(files).length} inputs:`)
    filePaths.forEach((p) => console.log(`    ${p}`))

    const { modules, validators } = typeCheckFiles(lib, files, (current, rel) =>
        resolve(join(dirname(current), rel))
    )

    const [js, dts, ts] = LoadedScriptsWriter.new()
        .writeModules(modules)
        .writeValidators(validators)
        .finalize()

    if (format == "typescript") {
        const tsPath = join(outDir, "index.ts")

        writeFileSync(tsPath, ts)

        console.log(`  Output:`)
        console.log(`    ${tsPath}`)
    } else {
        const jsPath = join(outDir, "index.js")
        const dtsPath = join(outDir, "index.d.ts")

        writeFileSync(jsPath, js)
        writeFileSync(dtsPath, dts)

        console.log(`  Output:`)
        console.log(`    ${jsPath}`)
        console.log(`    ${dtsPath}`)
    }
}

main()

/**
 * @param {string[]} args
 * @returns {{outDir: string, isTypescript: boolean}}
 */
function parseArgs(args) {
    const isTypescript = args.indexOf("--ts") != -1

    let i = args.indexOf("-o")
    if (i != -1) {
        if (i == args.length - 1 || args[i+1].startsWith("-")) {
            throw new Error("expected argument after -o")
        }

        return { outDir: resolve(args[i + 1]), isTypescript }
    } else {
        return { outDir: process.cwd(), isTypescript }
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
 * @param {string} fileName
 * @returns {Option<string>}
 */
function findPackageJson(fileName = "package.json") {
    let dir = process.cwd()

    let path = join(dir, fileName)
    let found = existsSync(path)

    while(!found) {
        dir = dirname(dir)
        path = join(dir, fileName)
        found = existsSync(path)
    }

    if (found) {
        return path
    } else {
        return None
    }
}