/**
 * @typedef {import("./Lib.js").Lib} Lib
 */

/**
 * @implements {Lib}
 */
export class Lib_v0_16 {
    /**
     * @param {any} lib 
     */
    constructor(lib) {
        this.lib = lib
    }

    /**
     * @type {string}
     */
    get version() {
        return this.lib.VERSION
    }
}