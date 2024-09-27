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

describe("Cip68Struct serialization", () => {
    /**
     * @type {TypeSchema}
     */
    const schema = {
        kind: "struct",
        format: "map",
        id: "has_field_tag",
        name: "FieldTagged",
        fieldTypes: [
            {
                name: "plainFieldName",
                type: {
                    kind: "internal",
                    name: "Int"
                }
            },
            {
                name: "taggedFieldName",
                encodingKey: "FNT",
                type: {
                    kind: "internal",
                    name: "String"
                    // encodingKey: "FNT"
                }
            }
        ]
    }

    const cast = new Cast(schema, { isMainnet: false })
    const greeting = "good day!"

    const exampleData = new ConstrData(0, [
        new MapData([
            [new ByteArrayData(encodeUtf8("plainFieldName")), new IntData(1)],
            [
                new ByteArrayData(encodeUtf8("FNT")),
                new ByteArrayData(encodeUtf8(greeting))
            ]
        ])
    ])
    const wrongPlainFieldName = new ConstrData(0, [
        new MapData([
            [
                new ByteArrayData(encodeUtf8("wrongPlainFieldName")),
                new IntData(1)
            ],
            [
                new ByteArrayData(encodeUtf8("FNT")),
                new ByteArrayData(encodeUtf8(greeting))
            ]
        ])
    ])

    const wrongEncoding = new ConstrData(0, [
        new MapData([
            [new ByteArrayData(encodeUtf8("plainFieldName")), new IntData(1)],
            [
                // has the definintion's field name, but should be the encoding key "FNT":
                new ByteArrayData(encodeUtf8("taggedFieldName")),
                new ByteArrayData(encodeUtf8(greeting))
            ]
        ])
    ])

    it("doesn't accept a struct with wrong encoding of field name when it expects a field-name tag", () => {
        throws(() => {
            cast.fromUplcData(wrongEncoding)
        }, /decoding .*field 'taggedFieldName' missing.*must be encoded as 'FNT'/)
    })

    it("doesn't accept a struct with wrong encoding (e.g. a typo) of untagged field-name", () => {
        throws(() => {
            cast.fromUplcData(wrongPlainFieldName)
        }, /decoding .* field 'plainFieldName' missing from MapData$/)
    })

    it("parses a correctly encoded struct", () => {
        const actualObj = cast.fromUplcData(exampleData)

        deepEqual(actualObj, {
            plainFieldName: 1n,
            taggedFieldName: greeting
        })
    })

    it("doesn't generate UplcData based on field-name tag", () => {
        throws(
            () => {
                cast.toUplcData({
                    plainFieldName: 1,
                    FNT: greeting
                }).toSchemaJson()
            },
            new RegExp(
                /field 'taggedFieldName' incorrectly specified as encoding-key 'FNT'/
            )
        )
    })

    it("includes input dataPath in thrown decoding errors (only if provided)", () => {
        throws(() => {
            cast.fromUplcData(wrongEncoding, "badThing")
        }, /... at badThing/)

        try {
            cast.fromUplcData(wrongEncoding)
            throw new Error("wrong encoding should have thrown an exception")
        } catch (x) {
            if (x.message.split("\n")[1]?.match(/\.\.\. at/)) {
                throw new Error(
                    `unexpected path in error message when input dataPath not provided\n - in thrown error message: \n\t${x.message}‹eom›`
                )
            }
        }
    })
})
