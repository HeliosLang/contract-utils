import { describe, it } from "node:test"
import { Cast } from "../cast/index.js"
import { ContractContextBuilder } from "./ContractContextBuilder.js"
import { deepEqual, strictEqual } from "node:assert"
import { Address, AssetClass } from "@helios-lang/ledger"

/**
 * @typedef {import("@helios-lang/codec-utils").IntLike} IntLike
 * @typedef {import("@helios-lang/ledger").TimeLike} TimeLike
 * @typedef {import("@helios-lang/ledger").UplcData} UplcData
 * @typedef {import("../cast/index.js").CastConfig} CastConfig
 * @typedef {import("../codegen/index.js").LoadedModule} LoadedModule
 * @typedef {import("../codegen/index.js").LoadedValidator} LoadedValidator
 */

/**
 * @template TStrict
 * @template TPermissive
 * @typedef {import("../cast/index.js").ConfigurableCast<TStrict, TPermissive>} ConfigurableCast
 */

/**
 * the following three scripts were generated using hl2ts
 */

const utils = {
    $name: /** @type {const} */ ("utils"),
    $purpose: /** @type {const} */ ("module"),
    $sourceCode:
        "module utils\n\nstruct MyUtilType {\n    hello: Int\n}\n\nconst my_assetclass: AssetClass = AssetClass::new(Scripts::match_string_policy, #)\n\nconst my_hash: ValidatorHash = Scripts::match_string\n\nfunc compare(a: String, b: String) -> Bool {\n    a == b\n}",
    $dependencies: /** @type {const} */ ([]),
    $types: {
        MyUtilType: (config) =>
            /** @type {Cast<{hello: bigint}, {hello: IntLike}>} */ (
                new Cast(
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
    $sourceCode:
        "minting match_string_policy\n\nfunc main(redeemer: Bool) -> Bool {\n    redeemer\n}",
    $dependencies: /** @type {const} */ ([]),
    $hashDependencies: [],
    $dependsOnOwnHash: false,
    $Redeemer: (config) =>
        /** @type {Cast<boolean, boolean>} */ (
            new Cast({ kind: "internal", name: "Bool" }, config)
        ),
    $types: {},
    $functions: {}
}

const match_string = {
    $name: /** @type {const} */ ("match_string"),
    $purpose: /** @type {const} */ ("spending"),
    $sourceCode:
        "spending match_string\n\nimport { compare, my_assetclass } from utils\n\nimport { tx } from ScriptContext\n\nenum Datum {\n One {\n  message: String\n }\n\n Two {\n  code: Int\n }\n}\n\nfunc main(datum: Datum, redeemer: String) -> Bool {\n compare(datum.switch{d: One => d.message, d: Two => d.code.show()}, redeemer) &&\n   tx.minted.get(my_assetclass) > 0\n}",
    $dependencies: /** @type {const} */ ([utils]),
    $hashDependencies: [match_string_policy],
    $dependsOnOwnHash: true,
    $Redeemer: (config) =>
        /** @type {Cast<string, string>} */ (
            new Cast({ kind: "internal", name: "String" }, config)
        ),
    $Datum: (config) =>
        /** @type {Cast<{One: {message: string}} | {Two: {code: bigint}}, {One: {message: string}} | {Two: {code: IntLike}}>} */ (
            new Cast(
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
                new Cast(
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

describe(`${ContractContextBuilder.name} typechecks`, () => {
    const ctx = ContractContextBuilder.new()
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
        const assetClass = new AssetClass(ctx.match_string_policy.$hash, [])

        strictEqual(
            assetClass.context.redeemer.fromUplcData(
                assetClass.context.redeemer.toUplcData(true)
            ),
            true
        )
        strictEqual(assetClass.toString().length, 28 * 2 + 1)
    })

    it(`Address with context ok`, () => {
        const addr = Address.fromHash(false, ctx.match_string.$hash)

        deepEqual(
            addr.spendingContext.datum.fromUplcData(
                addr.spendingContext.datum.toUplcData({
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
