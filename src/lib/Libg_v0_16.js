/**
 * @typedef {import("../codegen/index.js").Module} ModuleDetails
 * @typedef {import("../codegen/index.js").Validator} ValidatorDetails
 * @typedef {import("../codegen/index.js").TypeSchema} InternalTypeDetails
 * @typedef {import("./Lib.js").CompileOptions} CompileOptions
 * @typedef {import("./Lib.js").CompileOutput} CompileOutput
 * @typedef {import("./Lib.js").Lib} Lib
 * @typedef {import("./Lib.js").SourceDetails} SourceDetails
 */

import { bytesToHex } from "@helios-lang/compiler"
import { readHeader } from "@helios-lang/compiler-utils"
import { UplcProgramV1 } from "@helios-lang/uplc"

/**
 * @typedef {{
 *   [name: string]: string[]
 * }} DagDependencies
 */

/**
 * @typedef {{
 * }} HashType
 */

/**
 * @typedef {{
 *   includes: (m: string) => boolean
 * }} IR
 */

/**
 * @typedef {{
 *   name: string
 * }} EnumStatement
 */

/**
 * @typedef {{
 *   name: string
 * }} StructStatement
 */

/**
 * @typedef {StructStatement | EnumStatement | any} Statement
 */

/**
 * @typedef {{
 *   name: {value: string}
 *   filterDependencies: (all: Module[]) => Module[]
 *   statements: Statement[]
 * }} Module
 */
/**
 * @typedef {{
 *   name: string
 *   toIR: (ctx: any, extra: Map<string, IR>) => IR
 *   types: UserTypes
 *   mainImportedModules: Module[]
 *   mainModule: Module
 *   mainArgTypes: DataType[]
 * }} Program
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
 * @implements {Lib}
 */
export class Lib_v0_16 {
    /**
     * @param {any} lib
     */
    constructor(lib) {
        this.lib = lib
    }

    /**
     * @type {string}
     */
    get version() {
        return this.lib.VERSION
    }

    /**
     * @private
     * @param {string} purpose
     * @returns {HashType}
     */
    getValidatorType(purpose) {
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
     * @private
     * @param {SourceDetails[]} validators
     * @param {SourceDetails[]} modules
     * @param {{[name: string]: HashType}} validatorTypes
     * @returns {Program[]}
     */
    createPrograms(validators, modules, validatorTypes) {
        const moduleSrcs = modules.map((m) => m.sourceCode)

        return validators.map((v) =>
            this.lib.Program.newInternal(
                v.sourceCode,
                moduleSrcs,
                validatorTypes,
                {
                    allowPosParams: false,
                    invertEntryPoint: true
                }
            )
        )
    }

    /**
     * @private
     * @param {Program} program
     * @param {{[name: string]: HashType}} validatorTypes
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
     * @param {{[name: string]: HashType}} validatorTypes
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
     * @param {{[name: string]: SourceDetails}} validators
     * @param {{[name: string]: SourceDetails}} modules
     * @returns {{modules: {[name: string]: ModuleDetails}, validators: {[name: string]: ValidatorDetails}}}
     */
    typeCheck(validators, modules) {
        const validatorTypes = Object.fromEntries(
            Object.values(validators).map((v) => [
                v.name,
                this.getValidatorType(v.purpose)
            ])
        )

        // create validator programs
        let validatorPrograms = this.createPrograms(
            Object.values(validators),
            Object.values(modules),
            validatorTypes
        )

        // build dag
        const dag = this.buildDagDependencies(validatorPrograms, validatorTypes)

        // sort the validators according to the dag, a valid order should exist
        // validatorPrograms = this.sortValidators(validatorPrograms, dag)

        /**
         * @type {{[name: string]: ValidatorDetails}}
         */
        const validatorDetails = {}

        /**
         * @type {{[name: string]: ModuleDetails}}
         */
        const moduleDetails = {}

        for (let v of validatorPrograms) {
            const hashDependencies = dag[v.name]
            const allModules = v.mainImportedModules
            const moduleDepedencies = v.mainModule
                .filterDependencies(allModules)
                .map((m) => m.name.value)
            const purpose = validators[v.name].purpose

            validatorDetails[v.name] = {
                name: v.name,
                purpose: validators[v.name].purpose,
                sourceCode: validators[v.name].sourceCode,
                hashDependencies: hashDependencies,
                moduleDepedencies: moduleDepedencies,
                types: {},
                Redeemer: this.getInternalTypeDetails(
                    v.mainArgTypes[purpose == "spending" ? 1 : 0]
                ),
                Datum:
                    purpose == "spending"
                        ? this.getInternalTypeDetails(v.mainArgTypes[0])
                        : undefined
            }

            for (let m of v.mainImportedModules) {
                if (!(m.name.value in moduleDetails)) {
                    moduleDetails[m.name.value] = {
                        name: m.name.value,
                        purpose: "module",
                        sourceCode: modules[m.name.value].sourceCode,
                        moduleDepedencies: m
                            .filterDependencies(allModules)
                            .map((m) => m.name.value),
                        types: {} // not yet exported
                    }
                }
            }
        }

        return { modules: moduleDetails, validators: validatorDetails }
    }

    /**
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
            } else {
                throw e
            }
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
        const otherValidators = options.otherValidators ?? {}
        const otherValidatorTypes = Object.fromEntries(
            Object.keys(otherValidators).map((k) => {
                return [k, this.getValidatorType(otherValidators[k].purpose)]
            })
        )

        if (options.dependsOnOwnHash) {
            otherValidatorTypes[name] = this.getValidatorType(purpose)
        }

        const program = this.lib.Program.newInternal(
            main,
            modules,
            otherValidatorTypes,
            {
                allowPosParams: false,
                invertEntryPoint: true
            }
        )

        /**
         * @type {Map<any, any>}
         */
        const extra = new Map()
        const IR = this.lib.IR

        if (options.ownHash) {
            const key = `__helios__scripts__${name}`

            extra.set(key, new IR(`#${options.ownHash}`))
        } else if (options.dependsOnOwnHash) {
            const key = `__helios__scripts__${name}`
            let ir = new IR(`__PARAM_${program.nPosParams - 1}`)

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

        for (let other in otherValidators) {
            const key = `__helios__scripts__${other}`

            extra.set(key, new IR(`#${otherValidators[other]}`))
        }

        const optimize = options.optimize
        const ir = program.toIR(new this.lib.ToIRContext(optimize), extra)

        if (program.nPosParams > 0) {
            const irProgram = this.lib.IRParametricProgram.new(
                ir,
                purpose,
                program.nPosParams,
                optimize
            )

            const cborHex = bytesToHex(irProgram.toUplc().toCbor())

            return {
                cborHex
            }
        } else {
            const irProgram = this.lib.IRProgram.new(ir, purpose, optimize)

            const cborHex = bytesToHex(irProgram.toUplc().toCbor())

            return {
                cborHex
            }
        }
    }
}
