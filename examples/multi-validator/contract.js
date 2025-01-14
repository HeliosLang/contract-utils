import * as fs from "node:fs"
import {
    makeContractContextBuilder,
    writeContractContextArtifacts
} from "@helios-lang/contract-utils"
import { makeAddress, makeAssetClass } from "@helios-lang/ledger"
import { makeTxBuilder } from "@helios-lang/tx-utils"
import { match_string, match_string_policy, mixed_validator } from "./index.js"

export function createApp() {
    const context = makeContractContextBuilder()
        .with(match_string)
        .with(match_string_policy)
        .with(mixed_validator)
        .build({
            isMainnet: false,
            expectedHashes: {
                match_string_policy:
                    "9e7e5eb25233c50a348693d5b5d20d99bca2e2c76aea150038bd5d32" // expected hash for match_string_policy
            }
        })

    writeContractContextArtifacts(context, { outDir: "./dist", fs })

    console.log(context.match_string_policy.$hash.toHex())

    const assetClass = makeAssetClass(context.match_string_policy.$hash, [])

    const address = makeAddress(false, context.match_string.$hash)

    let b = makeTxBuilder({ isMainnet: false }).mintAssetClassWithRedeemer(
        assetClass,
        10,
        true
    )

    let c = b
        .payWithDatum(address, 1_000_000n, {
            hash: { One: { message: "hello" } }
        })
        // Types from Helios are propagated into Typescript, allowing typesafe conversion of Datums
        .payWithDatum(address, 2_000_000n, { hash: { Two: { code: 10 } } })
}

createApp()
