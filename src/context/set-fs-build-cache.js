import { contractContextCache } from "./ContractContextCache.js"

/**
 * @typedef {import("./ContractContextCache.js").ExplicitCache} ExplicitCache
 */

// uses same storage strategy as esbuild-plugin
/**
 * @implements {ExplicitCache}
 */
class FileSystemCache {
    /**
     * @private
     * @type {typeof import("node:fs")}
     */
    fs

    /**
     * @private
     * @type {typeof import("node:os")}
     */
    os

    /**
     * @private
     * @type {typeof import("node:path")}
     */
    path

    /**
     * @private
     * @type {string}
     */
    cacheDir

    constructor() {
        this.fs = require("node:fs")
        this.os = require("node:os")
        this.path = require("node:path")
        this.cacheDir = this.path.join(this.os.tmpdir(), "helios-cache")

        if (!this.fs.existsSync(this.cacheDir)) {
            this.fs.mkdirSync(this.cacheDir, {
                recursive: true
            })
        }
    }

    /**
     * @private
     * @param {string} key
     */
    genPath(key) {
        return this.path.join(this.cacheDir, key + ".json")
    }

    /**
     * @param {string} key
     */
    has(key) {
        return this.fs.existsSync(this.genPath(key))
    }

    /**
     * @param {string} key
     * @returns {JsonSafe}
     */
    get(key) {
        return JSON.parse(this.fs.readFileSync(this.genPath(key)).toString())
    }

    /**
     * @param {string} key
     * @param {JsonSafe} obj
     */
    set(key, obj) {
        this.fs.writeFileSync(this.genPath(key), JSON.stringify(obj))
    }
}

contractContextCache.explicitCache = new FileSystemCache()
