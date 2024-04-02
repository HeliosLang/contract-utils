import { ContractContextBuilder } from "@helios-lang/contract-utils"
import { Address, TxBuilder } from "@helios-lang/ledger"
import { match_string, match_string_policy } from "./index.js"

const context = ContractContextBuilder.new()
    .with(match_string)
    .with(match_string_policy)
    .build()

console.log(context.match_string_policy.toHex())

const address = Address.fromHash(context.match_string)

const b = new TxBuilder()
    .mint(context.match_string_policy, [["", 10]], "hello")
    .pay(address, 0n, { hash: { One: { message: "hello" } } })
