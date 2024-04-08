# Codegen multi policy

Run `npx hl2ts` to generate Javascript/Typescript equivalents of the `spending.hl` and `minting.hl` validators.

Then have a look at `contract.js` to see how these validators can be used within Javascript/Typescript in a type-safe way (ideally using VSCode so you can hover over the types).

# Installing compilers

If you want to use an older version of Helios (under the @hyperionbt org), you can use the following command.

```
npm install --save-exact @helios-lang/compiler:npm@hyperionbt/helios@<version>
```