/**
 * @import { AssertExtends } from "@helios-lang/type-utils"
 * @import { FileSystem } from "./index.js"
 */

/**
 * @typedef {typeof import("node:fs")} NodeFileSystem
 */

/**
 * @typedef {AssertExtends<FileSystem, NodeFileSystem>} NodeFileSystemExtendsFileSystem
 */
