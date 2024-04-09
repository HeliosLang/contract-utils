import { bytesToHex } from "@helios-lang/compiler"
import { readHeader } from "@helios-lang/compiler-utils"
import { expectSome } from "@helios-lang/type-utils"

/**
 * @typedef {import("../codegen/index.js").TypeCheckedModule} TypeCheckedModule
 * @typedef {import("../codegen/index.js").TypeCheckedValidator} TypeCheckedValidator
 * @typedef {import("../codegen/index.js").TypeSchema} InternalTypeDetails
 * @typedef {import("./CompilerLib.js").CompileOptions} CompileOptions
 * @typedef {import("./CompilerLib.js").CompileOutput} CompileOutput
 * @typedef {import("./CompilerLib.js").CompilerLib} CompilerLib
 * @typedef {import("./CompilerLib.js").SourceDetails} SourceDetails
 * @typedef {import("./CompilerLib.js").TypeCheckOutput} TypeCheckOutput
 */

/**
 * @typedef {{
 *   [name: string]: string[]
 * }} DagDependencies
 */

/**
 * @typedef {{
 * }} ScriptHashType
 */

/**
 * @typedef {{
 *   includes: (m: string) => boolean
 * }} IR
 */

/**
 * @typedef {{
 *   name: WordToken
 * }} Statement
 */

/**
 * @typedef {{
 *   src: {
 *     raw: string
 *   }
 * }} Site
 */

/**
 * @typedef {{
 *   value: string
 *   site: Site
 * }} WordToken
 */

/**
 * @typedef {{
 *   name: WordToken
 *   filterDependencies: (all: Module[]) => Module[]
 *   statements: Statement[]
 * }} Module
 */
/**
 * @typedef {{
 *   name: string
 *   purpose: "testing" | "minting" | "spending" | "staking" | "endpoint" | "module" | "unknown"
 *   toIR(ctx: any, extra: Map<string, IR>): IR
 *   types: UserTypes
 *   mainImportedModules: Module[]
 *   mainModule: Module
 *   mainArgTypes: DataType[]
 *   throwErrors()
 *   evalTypes(validatorTypes: {[name: string]: ScriptHashType}): TopScope
 * }} Program
 */

/**
 * @typedef {{
 *   getModuleScope(name: WordToken): Scope
 * }} TopScope
 */

/**
 * @typedef {{
 *   asDataType?: DataType
 * }} HeliosType
 */

/**
 * @typedef {{
 *   loopTypes(callback: (name: string, type: HeliosType) => void)
 * }} Scope
 */

/**
 * @typedef {{
 *   typeDetails?: TypeDetails
 * }} DataType
 */

/**
 * @typedef {{
 *   type:  string
 * } | {
 *   type:     "List"
 *   itemType: TypeSchema
 * } | {
 *   type:      "Map"
 *   keyType:   TypeSchema
 *   valueType: TypeSchema
 * } | {
 *   type:     "Option"
 *   someType: TypeSchema
 * } | {
 *   type:       "Struct"
 *   fieldTypes: NamedTypeSchema[]
 * } | {
 *   type:         "Enum"
 *   variantTypes: {name: string, fieldTypes: NamedTypeSchema[]}[]
 * }} TypeSchema
 */

/**
 * @typedef {{
 * 	 name: string
 * } & TypeSchema} NamedTypeSchema
 */

/**
 * @typedef {{
 *   inputType: string
 *   outputType: string
 *   internalType: TypeSchema
 * }} TypeDetails
 */

/**
 * @typedef {{
 * }} UserTypes
 */

/**
 * @implements {CompilerLib}
 */
export class CompilerLib_v0_16 {
    /**
     * @param {any} lib
     */
    constructor(lib) {
        this.lib = lib

        this.applyPatches()
    }

    /**
     * @private
     */
    applyPatches() {
        Object.defineProperty(this.lib.RawDataType, "typeDetails", {
            get: () => ({
                inputType: "UplcData",
                outputType: "UplcData",
                internalType: { type: "Data" }
            })
        })
    }

    /**
     * @type {string}
     */
    get version() {
        return this.lib.VERSION
    }

    /**
     * @param {string} purpose
     * @returns {ScriptHashType}
     */
    getScriptHashType(purpose) {
        switch (purpose) {
            case "spending":
                return this.lib.ValidatorHashType
            case "minting":
                return this.lib.MintingPolicyHashType
            case "staking":
                return this.lib.StakingValidatorHashType
            default:
                throw new Error("unhandled validator type")
        }
    }

    /**
     * @param {string} main
     * @param {string[]} modules
     * @param {CompileOptions} options
     * @returns {CompileOutput}
     */
    compile(main, modules, options) {
        const [purpose, name] = readHeader(main)

        // use `Program.newInternal()` instead of `Program.new()` so we can inject custom IR before finally compiling to a UplcProgram
        const program = this.lib.Program.newInternal(
            main,
            modules,
            options.allValidatorHashTypes,
            {
                allowPosParams: false,
                invertEntryPoint: true
            }
        )

        const extra = this.generateExtraIRDefinitions(
            name,
            purpose,
            program.nPosParams,
            options
        )
        const optimize = options.optimize
        const ir = program.toIR(new this.lib.ToIRContext(optimize), extra)

        const irProgram =
            program.nPosParams > 0
                ? this.lib.IRParametricProgram.new(
                      ir,
                      purpose,
                      program.nPosParams,
                      optimize
                  )
                : this.lib.IRProgram.new(ir, purpose, optimize)

        const cborHex = bytesToHex(irProgram.toUplc().toCbor())

        return {
            prettyIR: irProgram.program.annotate(),
            cborHex
        }
    }

    /**
     * @param {string[]} validators
     * @param {string[]} modules
     * @returns {TypeCheckOutput}
     */
    typeCheck(validators, modules) {
        const validatorTypes = Object.fromEntries(
            validators.map((v) => {
                const [purpose, name] = readHeader(v)
                return [name, this.getScriptHashType(purpose)]
            })
        )

        // create validator programs
        let validatorPrograms = this.createPrograms(
            validators,
            modules,
            validatorTypes
        )

        // build dag
        const dag = this.buildDagDependencies(validatorPrograms, validatorTypes)

        /**
         * @type {{[name: string]: TypeCheckedValidator}}
         */
        const typeCheckedValidators = {}

        /**
         * @type {{[name: string]: TypeCheckedModule}}
         */
        const typeCheckedModules = {}

        // collect the validators and the modules from the typechecked programs
        for (let v of validatorPrograms) {
            const name = v.name
            const purpose = v.purpose
            const sourceCode = v.mainModule.name.site.src.raw
            const hashDependencies = dag[name]
            const allTypes = this.getProgramTypes(v, validatorTypes)

            const allModules = v.mainImportedModules
            const moduleDepedencies = v.mainModule
                .filterDependencies(allModules)
                .map((m) => m.name.value)

            typeCheckedValidators[name] = {
                name: name,
                purpose: purpose,
                sourceCode: sourceCode,
                hashDependencies: hashDependencies,
                moduleDepedencies: moduleDepedencies,
                types: Object.fromEntries(
                    Object.entries(allTypes[name]).map(
                        ([typeName, typeDetails]) => [
                            typeName,
                            this.getInternalTypeDetails(typeDetails)
                        ]
                    )
                ),
                Redeemer: this.getInternalTypeDetails(
                    v.mainArgTypes[purpose == "spending" ? 1 : 0]
                ),
                Datum:
                    purpose == "spending"
                        ? this.getInternalTypeDetails(v.mainArgTypes[0])
                        : undefined
            }

            // add any module dependencies that haven't been added before
            for (let m of v.mainImportedModules) {
                const name = m.name.value
                const sourceCode = m.name.site.src.raw

                if (name in typeCheckedModules) {
                    continue
                }

                typeCheckedModules[name] = {
                    name: name,
                    purpose: "module",
                    sourceCode: sourceCode,
                    moduleDepedencies: m
                        .filterDependencies(allModules)
                        .map((m) => m.name.value),
                    types: Object.fromEntries(
                        Object.entries(allTypes[name]).map(
                            ([typeName, typeDetails]) => [
                                typeName,
                                this.getInternalTypeDetails(typeDetails)
                            ]
                        )
                    )
                }
            }
        }

        return {
            modules: typeCheckedModules,
            validators: typeCheckedValidators
        }
    }

    /**
     * Generate additional IR definitions
     *   * dependency on own precalculated hash (eg. unoptimized program should use hash of optimized program)
     *   * dependency on own hash through methods defined on the ScriptContext
     *   * dependency on hashes of other validators
     * @private
     * @param {string} name - name of the validator being compiled
     * @param {string} purpose - purpose the validator being compiled
     * @param {number} nPosParams
     * @param {CompileOptions} options
     * @returns {Map<string, IR>}
     */
    generateExtraIRDefinitions(name, purpose, nPosParams, options) {
        /**
         * @type {Map<string, IR>}
         */
        const extra = new Map()

        const IR = this.lib.IR

        // inject own hash (either precalculated, or via ScriptContext)
        if (options.ownHash) {
            extra.set(
                `__helios__scripts__${name}`,
                new IR(`#${options.ownHash}`)
            )
        } else if (options.dependsOnOwnHash) {
            const key = `__helios__scripts__${name}`
            let ir = new IR(`__PARAM_${nPosParams - 1}`)

            switch (purpose) {
                case "spending":
                    ir = new IR([
                        new IR(
                            `__helios__scriptcontext__get_current_validator_hash(`
                        ),
                        ir,
                        new IR(`)()`)
                    ])
                    break
                case "minting":
                    ir = new IR([
                        new IR(
                            `__helios__scriptcontext__get_current_minting_policy_hash(`
                        ),
                        ir,
                        new IR(`)()`)
                    ])
                    break
                default:
                    throw new Error("unhandled purpose")
            }

            extra.set(key, ir)
        }

        // inject hashes of other validators
        Object.entries(options.hashDependencies ?? {}).forEach(
            ([depName, dep]) => {
                extra.set(`__helios__scripts__${depName}`, new IR(`#${dep}`))
            }
        )

        return extra
    }

    /**
     * @private
     * @param {string[]} validators
     * @param {string[]} modules
     * @param {{[name: string]: ScriptHashType}} validatorTypes
     * @returns {Program[]}
     */
    createPrograms(validators, modules, validatorTypes) {
        return validators.map((v) =>
            this.lib.Program.newInternal(v, modules, validatorTypes, {
                allowPosParams: false,
                invertEntryPoint: true
            })
        )
    }

    /**
     * @private
     * @param {Program} program
     * @param {{[name: string]: ScriptHashType}} validatorTypes
     * @returns {IR}
     */
    toTestIR(program, validatorTypes) {
        const extra = new Map()

        for (let validatorName in validatorTypes) {
            extra.set(
                `__helios__scripts__${validatorName}`,
                new this.lib.IR(`#`)
            )
        }

        return program.toIR(new this.lib.ToIRContext(false), extra)
    }

    /**
     * @private
     * @param {Program[]} validators
     * @param {{[name: string]: ScriptHashType}} validatorTypes
     * @returns {DagDependencies}
     */
    buildDagDependencies(validators, validatorTypes) {
        /**
         * @type {DagDependencies}
         */
        const dag = {}

        validators.forEach((v) => {
            const ir = this.toTestIR(v, validatorTypes)

            dag[v.name] = Object.keys(validatorTypes).filter((name) =>
                ir.includes(`__helios__scripts__${name}`)
            )
        })

        return dag
    }

    /**
     * @private
     * @param {TypeSchema} it
     * @returns {InternalTypeDetails}
     */
    convertInternalType(it) {
        if ("itemType" in it) {
            return { listItemType: this.convertInternalType(it.itemType) }
        } else if ("someType" in it) {
            return { optionSomeType: this.convertInternalType(it.someType) }
        } else if ("fieldTypes" in it) {
            return {
                structFieldTypes: it.fieldTypes.map((ft) => ({
                    name: ft.name,
                    type: this.convertInternalType(ft)
                }))
            }
        } else if ("keyType" in it) {
            return {
                mapKeyType: this.convertInternalType(it.keyType),
                mapValueType: this.convertInternalType(it.valueType)
            }
        } else if ("variantTypes" in it) {
            return {
                enumVariantTypes: it.variantTypes.map((vt) => ({
                    name: vt.name,
                    fieldTypes: vt.fieldTypes.map((ft) => ({
                        name: ft.name,
                        type: this.convertInternalType(ft)
                    }))
                }))
            }
        } else {
            return { primitiveType: it.type }
        }
    }

    /**
     * Tries to convert a compiler type into TypeSchema
     * TODO: make sure it works for all structs and enums
     * @private
     * @param {DataType} dt
     * @returns {InternalTypeDetails}
     */
    getInternalTypeDetails(dt) {
        try {
            const it = dt?.typeDetails?.internalType ?? { type: "Any" }

            return this.convertInternalType(it)
        } catch (e) {
            if (e.message.includes("Data")) {
                return { primitiveType: "Data" }
            } else if (e.message.includes("DCert")) {
                return { primitiveType: "DCert" }
            } else if (e.message.includes("Credential")) {
                return { primitiveType: "SpendingCredential" }
            } else if (e.message.includes("OutputDatum")) {
                return { primitiveType: "TxOutputDatum" }
            } else if (e.message.includes("PubKey")) {
                return { primitiveType: "PubKey" }
            } else if (e.message.includes("ScriptHash")) {
                return { primitiveType: "ScriptHash" }
            } else {
                throw e
            }
        }
    }

    /**
     * @private
     * @param {Program} program
     * @param {{[name: string]: ScriptHashType}} validatorTypes
     * @returns {Record<string, Record<string, DataType>>}}
     */
    getProgramTypes(program, validatorTypes) {
        const topScope = program.evalTypes(validatorTypes)

        program.throwErrors()

        /**
         * @type {Record<string, Record<string, DataType>>}
         */
        const result = {}

        if (program.purpose != "endpoint") {
            const moduleNames = [program.mainModule.name].concat(
                program.mainImportedModules.map((m) => m.name)
            )

            for (let moduleName of moduleNames) {
                const module_ =
                    moduleName.value == program.name
                        ? program.mainModule
                        : expectSome(
                              program.mainImportedModules.find(
                                  (m) => m.name.value == moduleName.value
                              ),
                              `module ${moduleName.value} not found`
                          )

                /**
                 * @type {Record<string, DataType>}
                 */
                const moduleTypes = {}

                const moduleScope = topScope.getModuleScope(moduleName)

                moduleScope.loopTypes((name, type) => {
                    if (module_.statements.some((s) => s.name.value == name)) {
                        if (type?.asDataType) {
                            moduleTypes[name] = type.asDataType
                        }
                    }
                })

                result[moduleName.value] = moduleTypes
            }
        }

        return result
    }
}
