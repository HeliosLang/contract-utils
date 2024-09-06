import { deepEqual, strictEqual, throws } from "node:assert"
import { describe, it } from "node:test"
import { encodeUtf8 } from "@helios-lang/codec-utils"
import {
    ByteArrayData,
    ConstrData,
    IntData,
    ListData,
    MapData
} from "@helios-lang/uplc"
import { Cast } from "./Cast.js"

/**
 * @typedef {import("@helios-lang/type-utils").TypeSchema} TypeSchema
 */

/**
 * @template {Cast<any, any>} C
 * @typedef {import("./StrictType.js").StrictType<C>} StrictType
 */

describe(Cast.name, () => {
    it(`StrictType of string correctly extracted`, () => {
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

    describe("Cip68Struct", () => {
        /**
         * @type {TypeSchema}
         */
        const schema = {
            kind: "struct",
            format: "map",
            id: "pair",
            name: "Pair",
            fieldTypes: [
                {
                    name: "@a",
                    type: {
                        kind: "internal",
                        name: "Int"
                    }
                },
                {
                    name: "@b",
                    type: {
                        kind: "internal",
                        name: "Int"
                    }
                }
            ]
        }

        const cast = new Cast(schema, { isMainnet: false })

        const exampleData = new ConstrData(0, [
            new MapData([
                [new ByteArrayData(encodeUtf8("@b")), new IntData(1)],
                [new ByteArrayData(encodeUtf8("@a")), new IntData(2)]
            ])
        ])

        it("respects order when converting to uplc data", () => {
            strictEqual(
                cast
                    .toUplcData({
                        "@b": 1,
                        "@a": 2
                    })
                    .toSchemaJson(),
                exampleData.toSchemaJson()
            )
        })

        it("respects order when converting back to JS format", () => {
            const actualObj = cast.fromUplcData(exampleData)

            deepEqual(Object.entries(actualObj), [
                ["@b", 1n],
                ["@a", 2n]
            ])
        })
    })
})
