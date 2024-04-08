export { Cast } from "./cast/index.js"
export { ContractContextBuilder } from "./context/index.js"
export { typeCheckFiles, typeCheckScripts } from "./compiler/ops.js"
export { LoadedScriptsWriter } from "./codegen/LoadedScriptsWriter.js"
export { loadCompilerLib } from "./compiler/ops.js"

/**
 * @template {import("./cast/index.js").Cast} C
 * @typedef {import("./cast/index.js").StrictType<C>} StrictType
 */

/**
 * @template {import("./cast/index.js").Cast} C
 * @typedef {import("./cast/index.js").PermissiveType<C>} PermissiveType
 */
