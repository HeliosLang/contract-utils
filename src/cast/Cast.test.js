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
 * @import { EnumTypeSchema, TypeSchema } from "@helios-lang/type-utils"
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

    describe("enum", () => {
        // enum AwesomeThing {
        //     Incredible  // ConstrData#0 / tag 121
        //     42: Alive { milliseconds: Int }  // ConstrData#42
        //     Amazing { x : Int }  // ConstrData#43
        //     42000: SuperAwesome  // ConstrData #42000
        // }

        /**
         * @type {EnumTypeSchema}
         */
        const schema = {
            kind: /** @type {const} */ ("enum"),
            name: "AwesomeThing",
            id: "taggedEnum",
            variantTypes: [
                {
                    kind: /** @type {const} */ ("variant"),
                    tag: 0,
                    name: "Incredible",
                    id: "taggedEnum__Incredible",
                    fieldTypes: []
                },
                {
                    kind: /** @type {const} */ ("variant"),
                    tag: 42,
                    name: "Alive",
                    id: "taggedEnum__Alive",
                    fieldTypes: [
                        {
                            name: "milliseconds",
                            type: { kind: "internal", name: "Int" }
                        }
                    ]
                },
                {
                    kind: /** @type {const} */ ("variant"),
                    tag: 43,
                    name: "Amazing",
                    id: "taggedEnum__Amazing",
                    fieldTypes: []
                },
                {
                    kind: /** @type {const} */ ("variant"),
                    tag: 42000,
                    name: "SuperAwesome",
                    id: "taggedEnum__SuperAwesome",
                    fieldTypes: []
                }
            ]
        }

        const cast = makeCast(schema, { isMainnet: false })

        it("fromUplcData(ConstrData#0) == '{Incredible: {}}'", () => {
            const data = makeConstrData(0, [])
            deepEqual(cast.fromUplcData(data), { Incredible: {} })
        })

        it("fromUplcData(ConstrData#42) == { Alive: { milliseconds: 1000 } }", () => {
            const data = makeConstrData(42, [makeIntData(1000)])
            deepEqual(cast.fromUplcData(data), {
                Alive: { milliseconds: 1000 }
            })
        })

        it("fromUplcData(ConstrData#43) == { Amazing: {} }", () => {
            const data = makeConstrData(43, [])
            deepEqual(cast.fromUplcData(data), { Amazing: {} })
        })

        it("fromUplcData(ConstrData#42000) == { SuperAwesome: {} }", () => {
            const data = makeConstrData(42000, [])
            deepEqual(cast.fromUplcData(data), { SuperAwesome: {} })
        })

        it("toUplcData({ Incredible: {} }) == ConstrData#0", () => {
            const data = cast.toUplcData({ Incredible: {} })
            strictEqual(makeConstrData(0, []).isEqual(data), true)
        })

        it("toUplcData({ Alive: { milliseconds: 19_000 } }) == ConstrData#42", () => {
            const data = cast.toUplcData({ Alive: { milliseconds: 19_000 } })
            strictEqual(
                makeConstrData(42, [makeIntData(19_000)]).isEqual(data),
                true
            )
        })

        it("toUplcData({ Amazing: { x: 42 } }) == ConstrData#43", () => {
            const data = cast.toUplcData({ Amazing: {} })
            strictEqual(makeConstrData(43, []).isEqual(data), true)
        })

        it("toUplcData({ SuperAwesome: {} }) == ConstrData#42000", () => {
            const data = cast.toUplcData({ SuperAwesome: {} })
            strictEqual(makeConstrData(42000, []).isEqual(data), true)
        })

        it("toUplcData() throws on invalid variant tag", () => {
            throws(() => {
                cast.toUplcData({ Invalid: {} })
            }, /invalid enum variant 'Invalid'/)
        })

        it("fromUplcData() throws on invalid variant tag", () => {
            throws(() => {
                cast.fromUplcData(makeConstrData(123, []))
            }, /invalid enum variant tag 123/)
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
