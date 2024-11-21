import { deepEqual, strictEqual, throws } from "node:assert"
import { describe, it } from "node:test"
import { encodeUtf8 } from "@helios-lang/codec-utils"
import {
    makeByteArrayData,
    makeConstrData,
    makeIntData,
    makeListData,
    makeMapData
} from "@helios-lang/uplc"
import { makeCast } from "./Cast.js"

/**
 * @import { TypeSchema } from "@helios-lang/type-utils"
 * @import { Cast, StrictType } from "../index.js"
 */

describe("Cast", () => {
    it(`StrictType of string correctly extracted`, () => {
        /**
         * @type {Cast<string, string>}
         */
        const cast = makeCast(
            { kind: "internal", name: "String" },
            { isMainnet: false }
        )

        const data = makeByteArrayData(encodeUtf8("hello world"))

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
        const cast = makeCast(
            { kind: "internal", name: "String" },
            { isMainnet: false }
        )

        const data = makeIntData(0)

        throws(() => {
            cast.fromUplcData(data)
        })
    })

    describe("Ratio", () => {
        const cast = makeCast(
            { kind: "internal", name: "Ratio" },
            { isMainnet: false }
        )

        it("fromUplcData([10, 11]) == [10n, 11n]", () => {
            const data = makeListData([makeIntData(10), makeIntData(11)])

            deepEqual(cast.fromUplcData(data), [10n, 11n])
        })

        it("toUplcData([10, 11]) == [iData(10), iData(11)]", () => {
            const expectedData = makeListData([
                makeIntData(10),
                makeIntData(11)
            ])

            strictEqual(
                cast.toUplcData([10, 11]).toString(),
                expectedData.toString()
            )
        })
    })

    describe("mStruct", () => {
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

        const cast = makeCast(schema, { isMainnet: false })

        const exampleData = makeMapData([
            [makeByteArrayData(encodeUtf8("@b")), makeIntData(1)],
            [makeByteArrayData(encodeUtf8("@a")), makeIntData(2)]
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
                key: "FNT",
                type: {
                    kind: "internal",
                    name: "String"
                }
            }
        ]
    }

    const cast = makeCast(schema, { isMainnet: false })
    const greeting = "good day!"

    const exampleData = makeMapData([
        [makeByteArrayData(encodeUtf8("plainFieldName")), makeIntData(1)],
        [
            makeByteArrayData(encodeUtf8("FNT")),
            makeByteArrayData(encodeUtf8(greeting))
        ]
    ])

    const wrongPlainFieldName = makeMapData([
        [makeByteArrayData(encodeUtf8("wrongPlainFieldName")), makeIntData(1)],
        [
            makeByteArrayData(encodeUtf8("FNT")),
            makeByteArrayData(encodeUtf8(greeting))
        ]
    ])

    const wrongEncoding = makeMapData([
        [makeByteArrayData(encodeUtf8("plainFieldName")), makeIntData(1)],
        [
            // has the definintion's field name, but should be the encoding key "FNT":
            makeByteArrayData(encodeUtf8("taggedFieldName")),
            makeByteArrayData(encodeUtf8(greeting))
        ]
    ])

    const missingField = makeMapData([
        [makeByteArrayData(encodeUtf8("plainFieldName")), makeIntData(1)],
        [
            makeByteArrayData(encodeUtf8("wrongFieldName")),
            makeByteArrayData(encodeUtf8(greeting))
        ]
    ])

    it("doesn't accept a ConstrData wrapper around an mStruct", () => {
        throws(() => {
            cast.fromUplcData(makeConstrData(0, [exampleData]))
        }, /expected MapData, got 0\{/)
    })

    it("doesn't accept a struct with wrong encoding of field name when it expects a field-name tag", () => {
        throws(() => {
            cast.fromUplcData(wrongEncoding)
        }, /decoding .*field 'taggedFieldName' encoded by name .*must be.* 'FNT'/)
    })

    it("doesn't accept a struct with missing field, when it expects a field-name tag", () => {
        throws(() => {
            cast.fromUplcData(missingField)
        }, /decoding .*field 'taggedFieldName' missing .*must be encoded as 'FNT'/)
    })

    it("doesn't accept a struct with wrong encoding (e.g. a typo) of untagged field-name", () => {
        throws(() => {
            cast.fromUplcData(wrongPlainFieldName)
        }, /decoding .* field 'plainFieldName' missing/)
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
