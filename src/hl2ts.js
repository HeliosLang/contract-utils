#!/usr/bin/env node

import { loadLibrary } from "./lib/index.js"

async function main() {
    console.log("hl2ts")

    const lib = await loadLibrary()

    console.log(lib.version)
}

main()