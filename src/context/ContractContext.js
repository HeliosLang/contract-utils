import {
    StakingValidatorHash,
    ValidatorHash,
    MintingPolicyHash,
    ScriptHash
} from "@helios-lang/ledger"
import { Cast, UserFunc } from "../cast/index.js"

/**
 * @typedef {import("@helios-lang/uplc").UplcProgram} UplcProgram
 * @typedef {import("../cast/Cast.js").CastConfig} CastConfig
 * @typedef {import("../codegen/index.js").LoadedModule} LoadedModule
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
 * @template TStrict
 * @template TPermissive
 * @typedef {import("../cast/index.js").CastLike<TStrict, TPermissive>} CastLike
 */

/**
 * @template {CastLike<any, any>} C
 * @typedef {import("../cast/index.js").PermissiveType<C>} PermissiveType
 */

/**
 * @template {CastLike<any, any>} C
 * @typedef {import("../cast/index.js").StrictType<C>} StrictType
 */

/**
 * @typedef {(
 *   ValidatorHash<SpendingContext<any, any, any, any>> |
 *   MintingPolicyHash<MintingContext<any, any>> |
 *   StakingValidatorHash<StakingContext<any, any>> |
 *   ScriptHash
 * )} AnyContractValidatorContext
 */

/**
 * @template {LoadedValidator} V
 * @typedef {V extends {"$purpose": "spending", "$Datum": CastLike<any, any>, "$Redeemer": CastLike<any, any>} ? {
 *       $hash: ValidatorHash<
 *         SpendingContext<
 *           StrictType<V["$Datum"]>,
 *           PermissiveType<V["$Datum"]>,
 *           StrictType<V["$Redeemer"]>,
 *           PermissiveType<V["$Redeemer"]>
 *         >
 *       >
 *     } & ContractTypesContext<V["$types"]> & ContractUserFuncsContext<V["$functions"]> :
 *     V extends {"$purpose": "minting", "$Redeemer": CastLike<any, any>} ? {
 *       $hash: MintingPolicyHash<
 *         MintingContext<
 *           StrictType<V["$Redeemer"]>,
 *           PermissiveType<V["$Redeemer"]>
 *         >
 *       >
 *     } & ContractTypesContext<V["$types"]> & ContractUserFuncsContext<V["$functions"]> :
 *     V extends {"$purpose": ("certifying" | "rewarding" | "staking"), "$Redeemer": CastLike<any, any>} ? {
 *       $hash: StakingValidatorHash<
 *         StakingContext<
 *           StrictType<V["$Redeemer"]>,
 *           PermissiveType<V["$Redeemer"]>
 *         >
 *       >
 *     } & ContractTypesContext<V["$types"]> & ContractUserFuncsContext<V["$functions"]> :
 *     V extends {"$purpose": "mixed", "$Datum": CastLike<any, any>, "$Redeemer": CastLike<any, any>} ? {
 *       $hash: ScriptHash<
 *         SpendingContext<
 *            StrictType<V["$Datum"]>,
 *            PermissiveType<V["$Datum"]>,
 *            StrictType<V["$Redeemer"]>,
 *            PermissiveType<V["$Redeemer"]>
 *          >
 *       >
 *     } & ContractTypesContext<V["$types"]> & ContractUserFuncsContext<V["$functions"]> :
 *     never
 * } ContractValidatorContexts
 */

/**
 * @template {LoadedModule} V
 * @typedef {ContractTypesContext<V["$types"]> & ContractUserFuncsContext<V["$functions"]>} ContractModuleContexts
 */

/**
 * @template {{[typeName: string]: CastLike<any, any>}} T
 * @typedef {{
 *   [K in keyof T]: Cast<StrictType<T[K]>, PermissiveType<T[K]>>
 * }} ContractTypesContext
 */

/**
 * @template {{[funcName: string]: (uplc: UplcProgram, config: CastConfig) => UserFunc<any>}} T
 * @typedef {{
 *   [K in keyof T]: ReturnType<T[K]>
 * }} ContractUserFuncsContext
 */

/**
 * @template {{[name: string]: LoadedValidator}} Vs
 * @template {{[name: string]: LoadedModule}} Ms
 * @typedef {{
 *   [K in keyof Vs]: ContractValidatorContexts<Vs[K]>
 * } & {
 *   [K in keyof Ms]: ContractModuleContexts<Ms[K]>
 * }} ContractContext
 */
