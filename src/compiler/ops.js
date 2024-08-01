import * as unsafeLib from "@helios-lang/compiler"
import {
    translateImportPaths as translateImportPathsInternal,
    readHeader
} from "@helios-lang/compiler-utils"
import { CompilerLib_v0_16 } from "./CompilerLib_v0_16.js"
import { CompilerLib_v0_17 } from "./CompilerLib_v0_17.js"

/**
 * @typedef {import("./CompilerLib.js").CompilerLib} CompilerLib
 * @typedef {import("./CompilerLib.js")}
 * @typedef {import("./CompilerLib.js").TypeCheckOutput} TypeCheckOutput
 */

/**
 * @param {{VERSION: string}} lib
 * @returns {number[]}
 */
function getVersion(lib) {
    return lib.VERSION.split(".").map((v) => Number(v))
}

/**
 * The compiler library is passed as an argument instead of loading locally, so any optional configuration of the library can be done externally
 * @returns {CompilerLib}
 */
export function loadCompilerLib() {
    const [major, minor] = getVersion(unsafeLib)

    switch (major) {
        case 0:
            switch (minor) {
                case 16:
                    return new CompilerLib_v0_16(unsafeLib)
                case 17:
                    return new CompilerLib_v0_17(unsafeLib)
            }
        default:
            throw new Error(
                `compiler version ${unsafeLib.VERSION} not supported`
            )
    }
}

/**
 * The compiler library is passed as an argument instead of loading locally, so any optional configuration of the library can be done externally
 * @param {CompilerLib} lib
 * @param {{[path: string]: string}} files
 * @param {(current: string, rel: string) => string} relToAbs
 * @returns {TypeCheckOutput}
 */
export function typeCheckFiles(lib, files, relToAbs) {
    const scripts = translateImportPaths(files, relToAbs)

    return typeCheckScripts(lib, scripts)
}

/**
 * @param {CompilerLib} lib
 * @param {string[]} scripts
 * @returns {TypeCheckOutput}
 */
export function typeCheckScripts(lib, scripts) {
    const [validators, modules] = splitValidatorsAndModules(scripts)

    return lib.typeCheck(validators, modules)
}

/**
 * Filters out duplicates
 * @param {string[]} scripts
 * @returns {[string[], string[]]} - [validators, modules]
 */
function splitValidatorsAndModules(scripts) {
    /**
     * @type {Map<string, string>}
     */
    const validators = new Map()

    /**
     * @type {Map<string, string>}
     */
    const modules = new Map()

    scripts.forEach((s) => {
        const [purpose, name] = readHeader(s)

        switch (purpose) {
            case "module":
                modules.set(name, s)
                break
            case "mixed":
            case "minting":
            case "spending":
            case "certifying":
            case "rewarding":
            case "staking":
                validators.set(name, s)
                break
            default:
                throw new Error(
                    `unhandled script purpose ${purpose} in script ${name}`
                )
        }
    })

    return [Array.from(validators.values()), Array.from(modules.values())]
}

/**
 *
 * @param {{[path: string]: string}} files
 * @param {(current: string, rel: string) => string} relToAbs
 * @returns {string[]}
 */
function translateImportPaths(files, relToAbs) {
    const partialSources = {}

    for (let path in files) {
        const [purpose, name] = readHeader(files[path])

        partialSources[path] = {
            name: name,
            purpose: purpose,
            sourceCode: files[path]
        }
    }

    return Object.entries(files).map(([path, file]) =>
        translateImportPathsInternal(file, (relPath) => {
            const absPath = relToAbs(path, relPath)

            const d = partialSources[absPath] ?? partialSources[absPath + ".hl"]

            if (!d) {
                throw new Error(`'${relPath}' not found`)
            }

            return d.name
        })
    )
}
