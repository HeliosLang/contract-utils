import { ContractContextBuilder } from "@helios-lang/contract-utils"
import { Address, AssetClass } from "@helios-lang/ledger"
import { TxBuilder } from "@helios-lang/tx-utils"
import { match_string, match_string_policy } from "./index.js"

export function createApp() {
    const context = ContractContextBuilder.new()
        .with(match_string)
        .with(match_string_policy)
        .build({
            isMainnet: false,
            expectedHashes: {
                match_string_policy:
                    "f7c8a87011f1aec5967dd3cd68b7a2c26135d750867bfd957b4d8967" // expected hash for match_string_policy
            }
        })

    console.log(context.match_string_policy.$hash.toHex())

    const assetClass = new AssetClass(context.match_string_policy.$hash, [])

    const address = Address.fromHash(false, context.match_string.$hash)

    let b = TxBuilder.new({ isMainnet: false }).mint(assetClass, 10, true)

    let c = b
        .pay(address, 1_000_000n, { hash: { One: { message: "hello" } } })
        // Types from Helios are propagated into Typescript, allowing typesafe conversion of Datums
        .pay(address, 2_000_000n, { hash: { Two: { code: "hello" } } })
}

createApp()
