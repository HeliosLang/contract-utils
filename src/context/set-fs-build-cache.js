import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
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
     * @type {string}
     */
    cacheDir

    constructor() {
        this.cacheDir = path.join(os.tmpdir(), "helios-cache")

        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, {
                recursive: true
            })
        }
    }

    /**
     * @private
     * @param {string} key
     */
    genPath(key) {
        return path.join(this.cacheDir, key + ".json")
    }

    /**
     * @param {string} key
     */
    has(key) {
        return fs.existsSync(this.genPath(key))
    }

    /**
     * @param {string} key
     * @returns {JsonSafe}
     */
    get(key) {
        return JSON.parse(fs.readFileSync(this.genPath(key)).toString())
    }

    /**
     * @param {string} key
     * @param {JsonSafe} obj
     */
    set(key, obj) {
        fs.writeFileSync(this.genPath(key), JSON.stringify(obj))
    }
}

contractContextCache.explicitCache = new FileSystemCache()
