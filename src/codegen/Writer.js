export class Writer {
    /**
     * @private
     * @readonly
     * @type {string[]}
     */
    parts

    constructor() {
        this.parts = []
    }

    /**
     * @param {string} part
     * @returns {Writer}
     */
    write(part) {
        this.parts.push(part)
        return this
    }

    /**
     * @param {string} line
     * @returns {Writer}
     */
    writeLine(line) {
        this.parts.push(`${line}\n`)
        return this
    }

    /**
     * @returns {string}
     */
    finalize() {
        return this.parts.join("")
    }
}
