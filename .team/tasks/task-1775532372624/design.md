# Design — Export ShellFS in index.ts

## Files to Modify
- `src/index.ts`

## Change
Add one export line:
```ts
export { ShellFS } from './shell.js'
```

## No other changes needed
`ShellFS` is already fully implemented in `src/shell.ts`. This task is purely an export exposure.

## Edge Cases
- None. `ShellFS` constructor takes `AgenticFileSystem` which is already exported.

## Test Cases
- `import { ShellFS } from 'agentic-filesystem'` resolves
- `new ShellFS(fs).exec('ls /')` returns a string
