import { bytesToHex } from "@helios-lang/codec-utils"
import { expectDefined, isLeft, isString } from "@helios-lang/type-utils"
import {
    makeConstrData,
    makeUplcDataValue,
    makeUplcRuntimeError
} from "@helios-lang/uplc"
import { makeCast } from "./Cast.js"

/**
 * @import { Either, TypeSchema } from "@helios-lang/type-utils"
 * @import { CekResult, UplcData, UplcLogger, UplcProgram, UplcValue } from "@helios-lang/uplc"
 * @import { Cast, CastConfig, UnsafeArgsT, UserFunc, UserFuncProps } from "../index.js"
 */

/**
 * @template {{[argName: string]: any}} ArgsT
 * @template RetT
 * @param {UplcProgram} uplc
 * @param {UserFuncProps} props
 * @returns {UserFunc<ArgsT, RetT>}
 */
export function makeUserFunc(uplc, props) {
    return new UserFuncImpl(uplc, props)
}

/**
 * @template {{[argName: string]: any}} ArgsT
 * @template RetT
 * @implements {UserFunc<ArgsT, RetT>}
 */
class UserFuncImpl {
    /**
     * @readonly
     * @type {UplcProgram}
     */
    uplc

    /**
     * @readonly
     * @type {UserFuncProps}
     */
    props

    /**
     * @param {UplcProgram} uplc
     * @param {UserFuncProps} props
     */
    constructor(uplc, props) {
        this.uplc = uplc
        this.props = props
    }

    /**
     * @type {string}
     */
    get name() {
        return this.props.name
    }

    /**
     * @param {ArgsT} namedArgs
     * @param {UplcLogger | undefined} logOptions
     * @returns {RetT}
     */
    eval(namedArgs, logOptions = undefined) {
        return evalUserFunc(this.uplc, this.props, namedArgs, logOptions)
    }

    /**
     * @param {UnsafeArgsT<ArgsT>} namedArgs
     * @param {UplcLogger | undefined} logOptions
     * @returns {RetT extends void ? void : UplcData}
     */
    evalUnsafe(namedArgs, logOptions = undefined) {
        return evalUserFuncUnsafe(this.uplc, this.props, namedArgs, logOptions)
    }

    /**
     * @param {UnsafeArgsT<ArgsT>} namedArgs
     * @param {UplcLogger | undefined} logOptions - optional, passed to UplcProgram.eval if provided
     * @returns {CekResult}
     */
    profile(namedArgs, logOptions = undefined) {
        return profileUserFunc(this.uplc, this.props, namedArgs, logOptions)
    }
}

/**
 * @template {{[argName: string]: any}} ArgsT
 * @template RetT
 * @param {UplcProgram} program
 * @param {UserFuncProps} props
 * @param {ArgsT} namedArgs
 * @param {UplcLogger | undefined} logOptions
 * @returns {RetT}
 */
export function evalUserFunc(
    program,
    props,
    namedArgs,
    logOptions = undefined
) {
    /**
     * @type {{[argName: string]: any}}
     */
    const unsafeNamedArgs = {}

    Object.entries(namedArgs).forEach(([argName, argValue]) => {
        const argDetails = props.arguments.find((a) => a.name == argName)

        if (argDetails) {
            const typeSchema = argDetails.type

            unsafeNamedArgs[argName] = makeCast(
                typeSchema,
                props.castConfig
            ).toUplcData(argValue)
        } else if (["$currentScript", "$scriptContext"].includes(argName)) {
            unsafeNamedArgs[argName] = argValue
        } else {
            console.error(
                `invalid arg '${argName}' for user function ${props.name}`
            )
        }
    })

    const result = evalUserFuncUnsafe(
        program,
        props,
        /** @type {UnsafeArgsT<ArgsT>} */ (unsafeNamedArgs),
        logOptions
    )

    if (props.returns) {
        return makeCast(props.returns, props.castConfig).fromUplcData(
            expectDefined(/** @type {any} */ (result))
        )
    } else {
        return /** @type {any} */ (undefined)
    }
}

/**
 * @template {{[argName: string]: any}} ArgsT
 * @template RetT
 * @param {UplcProgram} program
 * @param {UserFuncProps} props
 * @param {UnsafeArgsT<ArgsT>} namedArgs
 * @param {UplcLogger | undefined} logOptions
 * @returns {RetT extends void ? void : UplcData}
 */
export function evalUserFuncUnsafe(
    program,
    props,
    namedArgs,
    logOptions = undefined
) {
    const result = profileUserFunc(program, props, namedArgs, logOptions).result

    if (isLeft(result)) {
        throw makeUplcRuntimeError(result.left.error, result.left.callSites)
    } else if (!isString(result.right) && result.right.kind == "data") {
        return /** @type {any} */ (result.right.value)
    } else if (props.returns) {
        throw new Error(`${result.right.toString()} isn't a UplcDataValue`)
    } else {
        return /** @type {any} */ (undefined)
    }
}

/**
 * @template {{[argName: string]: any}} ArgsT
 * @param {UplcProgram} program
 * @param {UserFuncProps} props
 * @param {UnsafeArgsT<ArgsT>} namedArgs
 * @param {UplcLogger | undefined} logOptions - optional, passed to UplcProgram.eval if provided
 * @returns {CekResult}
 */
export function profileUserFunc(
    program,
    props,
    namedArgs,
    logOptions = undefined
) {
    const isMain = props.name == "main"

    /**
     * @type {UplcData[]}
     */
    const args = []

    props.arguments.forEach(({ name, type, isOptional }) => {
        if (isMain) {
            if (isOptional) {
                // used for $datum in mixed script
                if (name in namedArgs && namedArgs[name]) {
                    args.push(namedArgs[name])
                }
            } else {
                args.push(expectDefined(namedArgs[name]))
            }
        } else {
            if (isOptional) {
                if (name in namedArgs && namedArgs[name]) {
                    args.push(makeConstrData(0, [namedArgs[name]]))
                } else {
                    args.push(makeConstrData(1, []))
                }
            } else {
                args.push(expectDefined(namedArgs[name]))
            }
        }
    })

    if (props.requiresScriptContext) {
        args.push(expectDefined(namedArgs["$scriptContext"]))
    }

    if (props.requiresCurrentScript) {
        const currentScriptName = expectDefined(
            /** @type {any} */ (namedArgs)["$currentScript"]
        )

        const index = expectDefined(
            expectDefined(props.validatorIndices)[currentScriptName]
        )

        args.push(makeConstrData(index, []))
    }

    const argValues = args.map((a) => makeUplcDataValue(a))

    const cekResult = program.eval(argValues, {
        logOptions: logOptions ?? undefined
    })

    if (program.alt?.plutusVersion == "PlutusScriptV2") {
        const cekResultUnoptim = program.alt.eval(argValues, {
            logOptions: logOptions ?? undefined
        })
        const resultUnoptim = cekResultUnoptim.result
        const resultUnoptimStr = evalResultToString(resultUnoptim)
        const resultStr = evalResultToString(cekResult.result)

        if (resultStr != resultUnoptimStr) {
            console.error(
                `## Unoptimized IR:\n${program.alt.ir ?? "not available"}`
            )

            args.forEach((a, i) => {
                console.error(`## Arg ${i}: ${bytesToHex(a.toCbor())}`)
            })

            throw new Error(
                `Critical error: expected ${resultUnoptimStr}, but got ${resultStr}. Contact Helios maintainers and share this console output`
            )
        }

        // also make sure the cost is an improvement
        if (cekResult.cost.mem > cekResultUnoptim.cost.mem) {
            throw new Error(
                `Critical error: optimizer worsened memory cost of ${props.name}`
            )
        }

        if (cekResult.cost.cpu > cekResultUnoptim.cost.cpu) {
            throw new Error(
                `Critical error: optimizer worsened cpu cost of ${props.name}`
            )
        }

        if (
            cekResult.cost.mem == cekResultUnoptim.cost.mem &&
            cekResult.cost.cpu == cekResultUnoptim.cost.cpu
        ) {
            console.error(
                `Warning: optimizer didn't improve cost of ${props.name}`
            )
        }

        // overwrite the optimized cekResult.result with the unoptimized result because it contains more information
        cekResult.result = resultUnoptim
    }

    return cekResult
}

/**
 * @param {Either<{error: string}, string | UplcValue>} result
 * @returns {string}
 */
function evalResultToString(result) {
    if (isLeft(result)) {
        return "error"
    } else {
        if (isString(result.right)) {
            return result.right
        } else if (result.right.kind == "data") {
            return result.right.value.toString()
        } else {
            return result.right.toString()
        }
    }
}
