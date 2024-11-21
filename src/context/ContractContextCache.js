import { bytesToHex, encodeUtf8 } from "@helios-lang/codec-utils"
import { blake2b } from "@helios-lang/crypto"
import { JSON } from "@helios-lang/type-utils"
import { cacheEntryFromJson, cacheEntryToJsonSafe } from "./CacheEntry.js"

/**
 * @import { UplcData, UplcProgram } from "@helios-lang/uplc"
 * @import { LoadedModule, LoadedValidator } from "../index.js"
 * @typedef {import("./CacheEntry.js").CacheEntry} CacheEntry
 * @typedef {import("./CacheEntry.js").CacheEntryJson} CacheEntryJson
 * @typedef {import("./CacheEntry.js").CacheEntryUserFuncsJson} CacheEntryUserFuncsJson
 * @typedef {import("./CacheEntry.js").CacheEntryValidatorsJson} CacheEntryValidatorsJson
 */

/**
 * @typedef {{
 *   has(key: string): boolean
 *   get(key: string): JsonSafe
 *   set(key: string, entry: JsonSafe): void
 * }} ExplicitCache
 */

class ContractContextCache {
    /**
     * Used by esbuild-plugin
     * @private
     * @type {CacheEntry[]}
     */
    positionalCache

    /**
     * Explicitly specified by user by calling setBuildCache()
     * @readwrite
     * @type {Option<ExplicitCache>}
     */
    explicitCache

    /**
     * Load count
     * @private
     * @type {number}
     */
    i

    /**
     * @private
     * @type {boolean}
     */
    enabled

    constructor() {
        this.positionalCache = []
        this.enabled = false
        this.i = 0
    }

    enable() {
        this.enabled = true
    }

    /**
     * Key is only generated if the explicitCache is set
     * @param {{
     *   version: string
     *   debug: boolean
     *   isMainnet: boolean
     *   validators: Record<string, LoadedValidator>
     *   modules: Record<string, LoadedModule>
     *   parameters: Record<string, UplcData>
     * }} props
     * @returns {string}
     */
    genCacheKey(props) {
        if (this.explicitCache) {
            const obj = {
                version: props.version,
                debug: props.debug,
                isMainnet: props.isMainnet,
                validators: Object.keys(props.validators)
                    .sort()
                    .map((k) => props.validators[k].$sourceCode),
                modules: Object.keys(props.modules)
                    .sort()
                    .map((k) => props.modules[k].$sourceCode),
                parameters: Object.keys(props.parameters)
                    .sort()
                    .map((k) => props.parameters[k].toSchemaJson())
            }

            // TODO: if this hashing method is slow fall back to system defined hashing
            const digest = blake2b(encodeUtf8(JSON.stringify(obj)))

            return bytesToHex(digest)
        } else {
            return ""
        }
    }

    /**
     * @param {CacheEntryJson[]} json
     */
    load(json) {
        this.positionalCache = json.map(cacheEntryFromJson)
    }

    /**
     * @param {string} key - empty string is used to set positional cache (eg. for esbuild-plugn)
     * @param {CacheEntry} entry
     */
    set(key, entry) {
        if (key != "" && this.explicitCache && !this.explicitCache.has(key)) {
            this.explicitCache.set(key, cacheEntryToJsonSafe(entry))
        } else if (this.enabled) {
            this.positionalCache.push(entry)
        }
    }

    /**
     * @param {string} key - empty string is used to access positional cache (eg. for esbuild-plugn)
     * @returns {Option<CacheEntry>}
     */
    get(key) {
        if (key != "") {
            if (this.explicitCache && this.explicitCache.has(key)) {
                return cacheEntryFromJson(
                    /** @type {CacheEntryJson} */ (this.explicitCache.get(key))
                )
            }

            return undefined
        } else {
            if (this.i >= this.positionalCache.length) {
                // TODO: lookup in explicitCache
                return undefined
            }

            const res = this.positionalCache[this.i]

            this.i += 1

            return res
        }
    }

    /**
     * @return {CacheEntryJson[]}
     */
    toJson() {
        return this.positionalCache.map(cacheEntryToJsonSafe)
    }
}

export const contractContextCache = new ContractContextCache()
