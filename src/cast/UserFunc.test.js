import { describe, it } from "node:test"
import { UserFunc } from "./UserFunc.js"
import { UplcConst, UplcDelay, UplcInt, UplcProgramV2 } from "@helios-lang/uplc"

describe("UserFunc<{}, void>", () => {
    const uplcProgram = new UplcProgramV2(
        new UplcDelay(new UplcConst(new UplcInt(0)))
    )

    /**
     * @type {UserFunc<{}, void>}
     */
    const userFunc = new UserFunc(uplcProgram, {
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
