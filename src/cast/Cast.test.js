import { deepEqual, strictEqual, throws } from "node:assert"
import { describe, it } from "node:test"
import { encodeUtf8 } from "@helios-lang/codec-utils"
import { ByteArrayData, IntData, ListData } from "@helios-lang/uplc"
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

    describe("Ratio", () => {
        const cast = new Cast(
            { kind: "internal", name: "Ratio" },
            { isMainnet: false }
        )

        it("fromUplcData([10, 11]) == [10n, 11n]", () => {
            const data = new ListData([new IntData(10), new IntData(11)])

            deepEqual(cast.fromUplcData(data), [10n, 11n])
        })

        it("toUplcData([10, 11]) == [iData(10), iData(11)]", () => {
            const expectedData = new ListData([
                new IntData(10),
                new IntData(11)
            ])

            strictEqual(
                cast.toUplcData([10, 11]).toString(),
                expectedData.toString()
            )
        })
    })
})
