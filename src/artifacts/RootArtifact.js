import { ArtifactWriter } from "./ArtifactWriter.js"
import { writeModuleArtifact } from "./ModuleArtifact.js"
import { writeValidatorArtifact } from "./ValidatorArtifact.js"

/**
 * @import { ContractContext, ContractModuleContexts, ContractValidatorContexts, FileSystem, LoadedValidator, WriteContractContextArtifactsOptions } from "../index.js"
 * @import { Artifact } from "./Artifact.js"
 */

/**
 * @param {any} context - TODO: make this typesafe (`ContractContext<any, any>` or `ContractContext` doesn't seem to work)
 * @param {WriteContractContextArtifactsOptions} options - not optional, at least the fs and outDir must be specified
 */
export function writeContractContextArtifacts(context, options) {
    const isMainnet = extractIsMainnet(context)

    const root = new RootArtifact(options.fs, options.outDir, isMainnet)

    for (let moduleName in context) {
        if (moduleName.startsWith("$")) {
            continue
        }

        const moduleDetails = context[moduleName]

        if (moduleDetails.$hash) {
            writeValidatorArtifact(
                root,
                moduleName,
                moduleDetails.$hash,
                moduleDetails
            )
        } else {
            writeModuleArtifact(root, moduleName, moduleDetails)
        }
    }

    root.save()
}

/**
 * @implements {Artifact}
 */
class RootArtifact extends ArtifactWriter {
    /**
     * @readonly
     * @type {boolean}
     */
    isMainnet

    /**
     * @param {FileSystem} fs
     * @param {string} dir
     * @param {boolean} isMainnet
     */
    constructor(fs, dir, isMainnet) {
        super(fs, dir)

        this.isMainnet = isMainnet
    }
}

/**
 * @param {any} context
 * @returns {boolean}
 */
function extractIsMainnet(context) {
    /**
     * @type {boolean | undefined}
     */
    let isMainnet = undefined

    /**
     * @param {boolean} b
     */
    const setIsMainnet = (b) => {
        if (isMainnet === undefined) {
            isMainnet = b
        } else if (isMainnet != b) {
            throw new Error("isMainnet inconsistent in contract context")
        }
    }

    let stack = [context]

    let obj = stack.pop()

    while (obj) {
        if ("isMainnet" in obj && typeof obj.isMainnet == "boolean") {
            setIsMainnet(obj.isMainnet)
        } else if ("$isMainnet" in obj && typeof obj.$isMainnet == "boolean") {
            setIsMainnet(obj.$isMainnet)
        }

        for (let key in obj) {
            if (typeof obj[key] === "object" && obj[key] !== null) {
                stack.push(obj[key])
            }
        }

        obj = stack.pop()
    }

    return isMainnet ?? false
}
