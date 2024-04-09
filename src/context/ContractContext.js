import {
    StakingValidatorHash,
    ValidatorHash,
    MintingPolicyHash
} from "@helios-lang/ledger"
import { Cast } from "../cast/index.js"

/**
 * @typedef {import("../codegen/index.js").LoadedValidator} LoadedValidator
 */

/**
 * @template TRedeemerStrict
 * @template TRedeemerPermissive
 * @typedef {import("@helios-lang/ledger").MintingContext<TRedeemerStrict, TRedeemerPermissive>} MintingContext
 */

/**
 * @template TDatumStrict
 * @template TDatumPermissive
 * @template TRedeemerStrict
 * @template TRedeemerPermissive
 * @typedef {import("@helios-lang/ledger").SpendingContext<TDatumStrict, TDatumPermissive, TRedeemerStrict, TRedeemerPermissive>} SpendingContext
 */

/**
 * @template TRedeemerStrict
 * @template TRedeemerPermissive
 * @typedef {import("@helios-lang/ledger").StakingContext<TRedeemerStrict, TRedeemerPermissive>} StakingContext
 */

/**
 * @template {Cast} C
 * @typedef {import("../cast/index.js").PermissiveType<C>} PermissiveType
 */

/**
 * @template {Cast} C
 * @typedef {import("../cast/index.js").StrictType<C>} StrictType
 */

/**
 * @typedef {(
 *   ValidatorHash<SpendingContext<any, any, any, any>> |
 *   MintingPolicyHash<MintingContext<any, any>> |
 *   StakingValidatorHash<StakingContext<any, any>>
 * )} AnyContractValidatorHash
 */

/**
 * @template {LoadedValidator} V
 * @typedef {V extends {"$purpose": "spending", "$Datum": Cast} ? ValidatorHash<
 *       SpendingContext<
 *         StrictType<V["$Datum"]>,
 *         PermissiveType<V["$Datum"]>,
 *         StrictType<V["$Redeemer"]>,
 *         PermissiveType<V["$Redeemer"]>
 *       >
 *     > :
 *     V extends {"$purpose": "minting"} ? MintingPolicyHash<
 *       MintingContext<
 *         StrictType<V["$Redeemer"]>,
 *         PermissiveType<V["$Redeemer"]>
 *       >
 *     > :
 *     V extends {"$purpose": ("certifying" | "rewarding" | "staking")} ? StakingValidatorHash<
 *       StakingContext<
 *         StrictType<V["$Redeemer"]>,
 *         PermissiveType<V["$Redeemer"]>
 *       >
 *     > : never
 * } ContractValidatorHash
 */

/**
 * @template {{[name: string]: LoadedValidator}} T
 * @typedef {{[K in keyof T]: ContractValidatorHash<T[K]>}} ContractContext
 */
