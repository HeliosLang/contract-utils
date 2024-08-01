import { describe, it } from "node:test"
import { strictEqual, throws } from "node:assert"
import { encodeUtf8 } from "@helios-lang/codec-utils"
import { ByteArrayData, IntData } from "@helios-lang/uplc"
import { Cast } from "./Cast.js"

/**
 * @template {Cast<any, any>} C
 * @typedef {import("./StrictType.js").StrictType<C>} StrictType
 */

describe(Cast.name, () => {
    it(`StrictType of string correctly extract`, () => {
        /**
         * @type {Cast<string, string>}
         */
        const cast = new Cast(
            { kind: "internal", name: "String" },
            { isMainnet: false }
        )

        const data = new ByteArrayData(encodeUtf8("hello world"))

        /**
         * @satisfies {StrictType<typeof cast>}
         */
        const strictType = cast.fromUplcData(data)

        strictEqual(strictType, "hello world")
    })

    it(`throws if wrong UplcData is being cast`, () => {
        /**
         * @type {Cast<string, string>}
         */
        const cast = new Cast(
            { kind: "internal", name: "String" },
            { isMainnet: false }
        )

        const data = new IntData(0)

        throws(() => {
            cast.fromUplcData(data)
        })
    })
})
