import { deepEqual } from "node:assert"
import { describe, it } from "node:test"
import { expectDefined } from "@helios-lang/type-utils"
import { makeByteArrayData, makeIntData } from "@helios-lang/uplc"
import { makeCast } from "../cast/index.js"
import { loadCompilerLib, typeCheckScripts } from "./ops.js"

/**
 * @import { TypeSchema } from "@helios-lang/type-utils"
 * @import { CastConfig } from "../index.js"
 */

/**
 * @typedef {CastConfig}
 */
const castConfig = { isMainnet: false }

describe(typeCheckScripts.name, () => {
    it("correctly generates typeschema for enum containing a map", () => {
        const src = `
        spending test

        enum Datum {
            Foo
            Bar { data: Map[String]Data } 
        }
        
        func main(datum: Datum, _) -> Bool {
            datum == datum
        }
        `

        const lib = loadCompilerLib()
        const { validators } = typeCheckScripts(lib, [src])
        const datumTypeSchema = expectDefined(validators.test.Datum)

        /**
         * @type {TypeSchema}
         */
        const expectedTypeSchema = {
            kind: "enum",
            id: "__module__test__Datum[]",
            name: "Datum",
            variantTypes: [
                {
                    kind: "variant",
                    tag: 0,
                    id: "__module__test__Datum[]__Foo",
                    name: "Foo",
                    fieldTypes: []
                },
                {
                    kind: "variant",
                    tag: 1,
                    name: "Bar",
                    id: "__module__test__Datum[]__Bar",
                    fieldTypes: [
                        {
                            name: "data",
                            type: {
                                kind: "map",
                                keyType: {
                                    kind: "internal",
                                    name: "String"
                                },
                                valueType: {
                                    kind: "internal",
                                    name: "Data"
                                }
                            }
                        }
                    ]
                }
            ]
        }

        deepEqual(datumTypeSchema, expectedTypeSchema)

        const cast = makeCast(datumTypeSchema, castConfig)

        cast.fromUplcData(
            cast.toUplcData({
                Foo: {}
            })
        )

        cast.fromUplcData(
            cast.toUplcData({
                Bar: {
                    data: [
                        ["hello", makeIntData(0)],
                        ["world", makeByteArrayData([])]
                    ]
                }
            })
        )
    })

    it("correctly generates typeschema for a map-type struct (Cip68)", () => {
        const src = `
        spending test

        struct cip68 {
           field1: Int "f1"
           field2: String
        }
        enum Datum {
            Foo
            MapRec { data: cip68 } 
        }
        
        func main(datum: Datum, _) -> Bool {
            datum == datum
        }
        `

        const lib = loadCompilerLib()
        const { validators } = typeCheckScripts(lib, [src])
        const datumTypeSchema = expectDefined(validators.test.Datum)

        const cast = makeCast(datumTypeSchema, castConfig)

        const inputData = { field1: 42, field2: "hello" }
        const uplcData = cast.toUplcData({
            MapRec: { data: inputData }
        })

        const result = cast.fromUplcData(uplcData)
        deepEqual(result.MapRec.data, inputData)
    })
})

// todo when we can import test/utils.js from the compiler more easily
// describe("integration with UplcProgram", () => {
//     // compileForRun
//     it.todo("test: round-trips an fStruct", async () => {})
//     it.todo("test: round-trips an mStruct", async () => {})
//     it.todo("test: round-trips a CIP-68 struct", async () => {})
// })
