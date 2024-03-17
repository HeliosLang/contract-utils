/**
 * @typedef {{
 *   version: string
 * }} Lib
 */

/**
 * @param {{VERSION: string}} lib
 * @returns {number[]}
 */
export function getVersion(lib) {
    return lib.VERSION.split(".").map(v => Number(v))
}