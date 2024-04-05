import { ContractContextBuilder } from "@helios-lang/contract-utils"
import { Address, TxBuilder } from "@helios-lang/ledger"
import { match_string, match_string_policy } from "./index.js"

const context = ContractContextBuilder.new()
    .with(match_string)
    .with(match_string_policy)
    .build({
        match_string_policy:
            "f7c8a87011f1aec5967dd3cd68b7a2c26135d750867bfd957b4d8967" // expected hash for match_string_policy
    })

console.log(context.match_string_policy.toHex())

const address = Address.fromHash(context.match_string)

const b = new TxBuilder()
    .mint(context.match_string_policy, [["", 10]], "hello")
    .pay(address, 1_000_000n, { hash: { One: { message: "hello" } } })
    // Types from Helios are propagated into Typescript, allowing typesafe conversion of Datums
    .pay(address, 2_000_000n, { hash: { Two: { message: "hello" } } })
