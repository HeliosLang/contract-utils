import { describe, it } from "node:test"
import {
    makeUplcConst,
    makeUplcDelay,
    makeUplcInt,
    makeUplcProgramV2
} from "@helios-lang/uplc"
import { makeUserFunc } from "./UserFunc.js"

/**
 * @import { UserFunc } from "../index.js"
 */

describe("UserFunc<{}, void>", () => {
    const uplcProgram = makeUplcProgramV2(
        makeUplcDelay({ arg: makeUplcConst({ value: makeUplcInt(0) }) })
    )

    /**
     * @type {UserFunc<{}, void>}
     */
    const userFunc = makeUserFunc(uplcProgram, {
        name: "main",
        arguments: [],
        requiresScriptContext: false,
        requiresCurrentScript: false,
        castConfig: {
            isMainnet: false
        }
    })

    it("return type of eval is void", () => {
        /**
         * @satisfies {void}
         */
        const res = userFunc.eval({})
    })

    it("return type of evalUnsafe is void", () => {
        /**
         * @satisfies {void}
         */
        const res = userFunc.evalUnsafe({})
    })
})
