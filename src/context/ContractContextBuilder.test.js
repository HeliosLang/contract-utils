import { deepEqual, strictEqual } from "node:assert"
import { describe, it } from "node:test"
import { makeAddress, makeAssetClass } from "@helios-lang/ledger"
import { makeCast } from "../cast/index.js"
import { makeContractContextBuilder } from "./ContractContextBuilder.js"

/**
 * @import { IntLike } from "@helios-lang/codec-utils"
 * @import { TimeLike } from "@helios-lang/ledger"
 * @import { UplcData } from "@helios-lang/uplc"
 * @import { Cast, CastConfig, ConfigurableCast, LoadedModule, LoadedValidator } from "../index.js"
 */

/**
 * the following three scripts were generated using hl2ts
 */

const utils = {
    $name: /** @type {const} */ ("utils"),
    $purpose: /** @type {const} */ ("module"),
    $sourceCode: `module utils
struct MyUtilType {
    hello: Int
}
const my_assetclass: AssetClass = AssetClass::new(Scripts::match_string_policy, #)
const my_hash: ValidatorHash = Scripts::match_string
func compare(a: String, b: String) -> Bool {
    a == b
}`,
    $dependencies: /** @type {const} */ ([]),
    $types: {
        MyUtilType: (config) =>
            /** @type {Cast<{hello: bigint}, {hello: IntLike}>} */ (
                makeCast(
                    {
                        kind: "struct",
                        id: "",
                        name: "MyUtilType",
                        format: "singleton",
                        fieldTypes: [
                            {
                                name: "hello",
                                type: { kind: "internal", name: "Int" }
                            }
                        ]
                    },
                    config
                )
            )
    },
    $functions: {}
}

const match_string_policy = {
    $name: /** @type {const} */ ("match_string_policy"),
    $purpose: /** @type {const} */ ("minting"),
    $currentScriptIndex: 0,
    $sourceCode: `minting match_string_policy
func main(redeemer: Bool) -> Bool {
    redeemer
}`,
    $dependencies: /** @type {const} */ ([]),
    $hashDependencies: [],
    $dependsOnOwnHash: false,
    $Redeemer: (config) =>
        /** @type {Cast<boolean, boolean>} */ (
            makeCast({ kind: "internal", name: "Bool" }, config)
        ),
    $types: {},
    $functions: {}
}

const match_string = {
    $name: /** @type {const} */ ("match_string"),
    $purpose: /** @type {const} */ ("spending"),
    $currentScriptIndex: 1,
    $sourceCode: `spending match_string
import { compare, my_assetclass } from utils
import { tx } from ScriptContext
enum Datum {
    One {
        message: String
    }
    Two {
        code: Int
    }
}
func main(datum: Datum, redeemer: String) -> Bool {
    compare(datum.switch{
        d: One => d.message, 
        d: Two => d.code.show()
    }, redeemer) &&
    tx.minted.get(my_assetclass) > 0
}`,
    $dependencies: /** @type {const} */ ([utils]),
    $hashDependencies: [match_string_policy],
    $dependsOnOwnHash: true,
    $Redeemer: (config) =>
        /** @type {Cast<string, string>} */ (
            makeCast({ kind: "internal", name: "String" }, config)
        ),
    $Datum: (config) =>
        /** @type {Cast<{One: {message: string}} | {Two: {code: bigint}}, {One: {message: string}} | {Two: {code: IntLike}}>} */ (
            makeCast(
                {
                    kind: "enum",
                    id: "",
                    name: "Datum",
                    variantTypes: [
                        {
                            kind: "variant",
                            name: "One",
                            tag: 0,
                            id: "",
                            fieldTypes: [
                                {
                                    name: "message",
                                    type: { kind: "internal", name: "String" }
                                }
                            ]
                        },
                        {
                            kind: "variant",
                            name: "Two",
                            tag: 1,
                            id: "",
                            fieldTypes: [
                                {
                                    name: "code",
                                    type: { kind: "internal", name: "Int" }
                                }
                            ]
                        }
                    ]
                },
                config
            )
        ),
    $types: {
        Datum: (config) =>
            /** @type {Cast<{One: {message: string}} | {Two: {code: bigint}}, {One: {message: string}} | {Two: {code: IntLike}}>} */ (
                makeCast(
                    {
                        kind: "enum",
                        id: "",
                        name: "Datum",
                        variantTypes: [
                            {
                                kind: "variant",
                                tag: 0,
                                id: "",
                                name: "One",
                                fieldTypes: [
                                    {
                                        name: "message",
                                        type: {
                                            kind: "internal",
                                            name: "String"
                                        }
                                    }
                                ]
                            },
                            {
                                kind: "variant",
                                name: "Two",
                                id: "",
                                tag: 1,
                                fieldTypes: [
                                    {
                                        name: "code",
                                        type: { kind: "internal", name: "Int" }
                                    }
                                ]
                            }
                        ]
                    },
                    config
                )
            )
    },
    $functions: {}
}

describe("ContractContextBuilder typechecks", () => {
    const ctx = makeContractContextBuilder()
        .with(match_string)
        .with(match_string_policy)
        .build({ isMainnet: false })

    it(`utils typechecks ok`, () => {
        const MyUtilType = ctx.utils.MyUtilType

        const obj = { hello: 100 }

        /**
         * @satisfies {{hello: bigint}}
         */
        const result = MyUtilType.fromUplcData(MyUtilType.toUplcData(obj))

        deepEqual(result, obj)
    })

    it(`AssetClass with context ok`, () => {
        const assetClass = makeAssetClass(ctx.match_string_policy.$hash, [])

        strictEqual(
            assetClass.mph.context.redeemer.fromUplcData(
                assetClass.mph.context.redeemer.toUplcData(true)
            ),
            true
        )
        strictEqual(assetClass.toString().length, 28 * 2 + 1)
    })

    it(`Address with context ok`, () => {
        const addr = makeAddress(false, ctx.match_string.$hash)

        deepEqual(
            addr.spendingCredential.context.datum.fromUplcData(
                addr.spendingCredential.context.datum.toUplcData({
                    One: { message: "hello" }
                })
            ),
            {
                One: { message: "hello" }
            }
        )

        strictEqual(addr.toBech32().length, 63)
    })
})
