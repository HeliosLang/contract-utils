/**
 * @import { FileSystem } from "../index.js"
 */

/**
 * @typedef {object} Artifact
 * @prop {string} dir
 * @prop {FileSystem} fs
 * @prop {boolean} isMainnet
 * @prop {(line: string) => void} writeDeclLine
 * @prop {(line: string) => void} writeDefLine
 * @prop {(name: string) => void} writeAggregateExport
 * @prop {() => void} save
 */
