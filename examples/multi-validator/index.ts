import type {UplcData} from "@helios-lang/ledger";
import { Address, AssetClass, DatumHash, MintingPolicyHash, PubKey, PubKeyHash, SpendingCredential, StakingCredential, StakingHash, StakingValidatorHash, TimeRange, TxId, TxOutputDatum, ValidatorHash, Value } from "@helios-lang/ledger";
import { Cast } from "@helios-lang/contract-utils";
export const utils = {
    $name: "utils",
    $purpose: "module",
    $sourceCode: "module utils\n\nconst my_assetclass: AssetClass = AssetClass::new(Scripts::match_string_policy, #)\n\nconst my_hash: ValidatorHash = Scripts::match_string\n\nfunc compare(a: String, b: String) -> Bool {\n    a == b\n}" as string,
    $dependencies: [],
}
export const match_string_policy = {
    $name: "match_string_policy",
    $purpose: "minting",
    $sourceCode: "minting match_string_policy\n\nfunc main(redeemer: Bool, _) -> Bool {\n    redeemer\n}" as string,
    $dependencies: [],
    $hashDependencies: [],
    $dependsOnOwnHash: false as boolean,
    $Redeemer: new Cast<boolean, boolean>({"primitiveType":"Bool"}),
    
}
export const match_string = {
    $name: "match_string",
    $purpose: "spending",
    $sourceCode: "spending match_string\n\nimport { compare, my_assetclass } from utils\n\nenum Datum {\n One {\n  message: String\n }\n\n Two {\n  code: Int\n }\n}\n\nfunc main(datum: Datum, redeemer: String, ctx: ScriptContext) -> Bool {\n compare(datum.switch{d: One => d.message, d: Two => d.code.show()}, redeemer) &&\n   ctx.tx.minted.get(my_assetclass) > 0\n}" as string,
    $dependencies: [utils],
    $hashDependencies: [match_string_policy],
    $dependsOnOwnHash: true as boolean,
    $Redeemer: new Cast<string, string>({"primitiveType":"String"}),
    $Datum: new Cast<{One: {message: string}} | {Two: {code: bigint}}, {One: {message: string}} | {Two: {code: bigint | number | string}}>({"enumVariantTypes":[{"name":"One","fieldTypes":[{"name":"message","type":{"primitiveType":"String"}}]},{"name":"Two","fieldTypes":[{"name":"code","type":{"primitiveType":"Int"}}]}]})
}
