export { makeCast, makeUserFunc } from "./cast/index.js"
export {
    makeContractContextBuilder,
    contractContextCache
} from "./context/index.js"
export { typeCheckFiles, typeCheckScripts } from "./compiler/ops.js"
export { makeLoadedScriptsWriter } from "./codegen/index.js"
export { loadCompilerLib } from "./compiler/ops.js"

/**
 * @import { MintingContext, MintingPolicyHash, ScriptHash, SpendingContext, StakingContext, StakingValidatorHash, ValidatorHash } from "@helios-lang/ledger"
 * @import { TypeSchema } from "@helios-lang/type-utils"
 * @import { CekResult, PlutusVersion, UplcData, UplcLogger, UplcProgram, UplcSourceMapJsonSafe } from "@helios-lang/uplc"
 */

/**
 * `returns` is optional to accomodate main functions that return undefined
 * @typedef {{
 *   name: string
 *   requiresScriptContext: boolean
 *   requiresCurrentScript: boolean
 *   arguments: {
 *     name: string
 *     type: TypeSchema
 *     isOptional: boolean
 *   }[]
 *   returns?: TypeSchema
 * }} TypeCheckedUserFunc
 */

/**
 * @typedef {{
 *   name: string
 *   purpose: string
 *   sourceCode: string
 *   moduleDepedencies: string[]
 *   types: Record<string, TypeSchema>
 *   functions?: Record<string, TypeCheckedUserFunc>
 * }} TypeCheckedModule
 */

/**
 * @typedef {TypeCheckedModule & {
 *   hashDependencies: string[]
 *   currentScriptIndex?: number
 *   Redeemer: TypeSchema
 *   Datum?: TypeSchema
 * }} TypeCheckedValidator
 */

/**
 * @typedef {any} ScriptHashType
 */

/**
 * if `debug` is true, the ir is included in the user functions where possible
 * @typedef {{
 *   allValidatorHashTypes: Record<string, ScriptHashType>
 *   allValidatorIndices?: Record<string, number>
 *   hashDependencies: Record<string, string>
 *   dependsOnOwnHash?: boolean
 *   ownHash?: string
 *   parameters?: Record<string, UplcData>
 *   isTestnet: boolean
 *   optimize: boolean
 *   debug?: boolean
 *   excludeUserFuncs?: Set<string>
 *   onCompileUserFunc?: (props: {
 *     name: string
 *     cborHex: string
 *     plutusVersion: PlutusVersion
 *     ir?: string
 *     sourceMap?: UplcSourceMapJsonSafe
 *     alt?: {
 *       cborHex: string
 *       ir?: string
 *       sourceMap?: UplcSourceMapJsonSafe
 *     }
 *   }) => void
 * }} CompileOptions
 */

/**
 * @typedef {{
 *   cborHex: string
 *   plutusVersion: PlutusVersion
 *   ir?: string
 *   sourceMap?: import("@helios-lang/uplc").UplcSourceMapJsonSafe
 * }} CompileOutput
 */

/**
 * @typedef {{
 *   modules: {[name: string]: TypeCheckedModule}
 *   validators: {[name: string]: TypeCheckedValidator}
 * }} TypeCheckOutput
 */

/**
 * @typedef {{
 *   name: string
 *   purpose: string
 *   sourceCode: string
 * }} SourceDetails
 */

/**
 * @typedef {{
 *   version: string
 *   getScriptHashType: (purpose: string) => ScriptHashType
 *   typeCheck: (validators: string[], modules: string[]) => ({
 *     modules: {[name: string]: TypeCheckedModule},
 *     validators: {[name: string]: TypeCheckedValidator}
 *   })
 *   compile: (main: string, modules: string[], options: CompileOptions) => CompileOutput
 * }} CompilerLib
 */

/**
 * @typedef {Record<string, string[]>} DagDependencies
 */

/**
 * @typedef {{
 *   isMainnet: boolean
 * }} CastConfig
 */

/**
 * @template TStrict
 * @template TPermissive
 * @typedef {object} Cast
 * @prop {"Cast"} kind
 * @prop {TypeSchema} schema
 * @prop {CastConfig} config
 * @prop {(data: UplcData, dataPath?: string) => TStrict} fromUplcData
 *
 * @prop {(x: TPermissive, dataPath?: string) => UplcData} toUplcData
 * converts javascript object to UPLC data, according to the schema.
 * The optional `dataPath` parameter can provide a contextual cue for the
 * data-conversion process, and will be displayed as part of any error messages
 * thrown during the data transformation
 */

/**
 * @template TStrict
 * @template TPermissive
 * @typedef {(config: CastConfig) => Cast<TStrict, TPermissive>} ConfigurableCast
 */

/**
 * StrictType and PermissiveType work for both Cast and ConfigurableCast
 * @template TStrict
 * @template TPermissive
 * @typedef {Cast<TStrict, TPermissive> | ConfigurableCast<TStrict, TPermissive>} CastLike
 */

/**
 * @typedef {Object} SchemaToUplcContext
 * @prop {Record<string, TypeSchema>} defs - symbol table permitting recursive schema references
 * @prop {string} dataPath - provides developer-facing cues for any parsing errors, showing the deep field path of any error
 */

/**
 * @typedef {Object} UplcToSchemaContext
 * @prop {Record<string, TypeSchema>} defs - symbol table permitting recursive schema references
 * @prop {string} dataPath - provides developer-facing cues for any parsing errors, showing the deep field path of any error
 * @prop {CastConfig} config - has isMainnet indicator
 */

/**
 * TODO: add logOptions here as well (which can be overridden by logOptions passed directly to eval(), evalUnsafe() and profile())?
 * `returns` is optional to accomodate main functions that return void
 * @typedef {{
 *   name: string
 *   requiresScriptContext: boolean
 *   requiresCurrentScript: boolean
 *   arguments: {
 *     name: string
 *     type: TypeSchema
 *     isOptional: boolean
 *   }[]
 *   returns?: TypeSchema
 *   validatorIndices?: Record<string, number>
 *   castConfig: CastConfig
 * }} UserFuncProps
 */

/**
 * @template ArgsT
 * @typedef {{[K in keyof ArgsT]: K extends "$currentScript" ? string : UplcData}} UnsafeArgsT
 */

/**
 * @template {{[argName: string]: any}} ArgsT
 * @template RetT
 * @typedef {object} UserFunc
 * @prop {UplcProgram} uplc
 * @prop {string} name
 * @prop {(namedArgs: ArgsT, logOptions?: UplcLogger | undefined) => RetT} eval
 * @prop {(namedArgs: UnsafeArgsT<ArgsT>, logOptions?: UplcLogger | undefined) => RetT extends void ? void : UplcData} evalUnsafe
 * @prop {(namedArgs: UnsafeArgsT<ArgsT>, logOptions?: UplcLogger | undefined) => CekResult} profile
 */

/**
 * @typedef {{
 *   $name: string
 *   $purpose: "module"
 *   $sourceCode: string
 *   $dependencies: ReadonlyArray<LoadedModule>
 *   $types: {[name: string]: CastLike<any, any>}
 *   $functions: {[name: string]: (uplc: UplcProgram, config: CastConfig) => UserFunc<any, any>}
 * }} LoadedModule
 */

/**
 * * Note: `$hashDependencies` doesn't contain the indirect dependencies! It must be kept to a minimum in order to inform in which order the validators must be compiled
 * @typedef {{
 *   $name: string
 *   $sourceCode: string
 *   $dependencies: ReadonlyArray<LoadedModule>
 *   $hashDependencies: ReadonlyArray<LoadedValidator>
 *   $currentScriptIndex?: number
 *   $dependsOnOwnHash: boolean
 *   $types: {[name: string]: CastLike<any, any>}
 *   $functions: {[name: string]: (uplc: UplcProgram, config: CastConfig) => UserFunc<any, any>}
 *   $Redeemer: CastLike<any, any>
 * } & (
 *   {
 *     $purpose: "spending" | "mixed"
 *     $Datum: CastLike<any, any>
 *   } | {
 *     $purpose: "minting" | "certifying" | "rewarding" | "staking"
 *   }
 * )} LoadedValidator
 */

/**
 * @template {{$name: string}} N
 * @typedef {{
 *   [name in N["$name"]]: Extract<N, {"$name": name}>
 * }} NamedDependencyToObject
 */

/**
 * @template {ReadonlyArray<{$name: string}>} N
 * @typedef {NamedDependencyToObject<N extends ReadonlyArray<infer M> ? M : never>} NamedDependenciesToObject
 */

/**
 * @template {LoadedValidator} V
 * @typedef {NamedDependenciesToObject<V["$dependencies"]>} ExtractDependencies
 */

/**
 * @template {CastLike<any, any>} C
 * @typedef {C extends CastLike<any, infer TPermissive> ? TPermissive : never} PermissiveType
 */

/**
 * @template {CastLike<any, any>} C
 * @typedef {C extends CastLike<infer TStrict, any> ? TStrict : never} StrictType
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
 * @template {{[funcName: string]: (uplc: UplcProgram, config: CastConfig) => UserFunc<any, any>}} T
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

/**
 * if `debug` is true, the ir is included where possible
 * @typedef {{
 *   isMainnet: boolean
 *   expectedHashes?: {[name: string]: string}
 *   parameters?: Record<string, UplcData>
 *   dumpHashes?: boolean
 *   debug?: boolean
 * }} ContractContextBuilderProps
 */

/**
 * @typedef {object} LoadedScriptsWriter
 * @prop {(modules: Record<string, TypeCheckedModule>) => LoadedScriptsWriter} writeModules
 * @prop {(validators: Record<string, TypeCheckedValidator>) => LoadedScriptsWriter} writeValidators
 * @prop {() => [string, string, string]} finalize
 */

/**
 * @template {{[name: string]: LoadedValidator}} Vs
 * @template {{[name: string]: LoadedModule}} Ms
 * @typedef {object} ContractContextBuilder
 * @prop {<V extends LoadedValidator>(validator: V) => ContractContextBuilder<Vs & {[K in V["$name"]]: V}, Ms & ExtractDependencies<V>>} with
 * @prop {<M extends LoadedModule>(m: M) => ContractContextBuilder<Vs, Ms & {[K in M["$name"]]: M}>} withModule
 * @prop {(props: ContractContextBuilderProps) => ContractContext<Vs, Ms>} build
 */
