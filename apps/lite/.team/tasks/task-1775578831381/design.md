# Design: Browser-safe shell_exec stub

## File
`src/tools/shell.ts`

## Status
Already implemented. `executeShell` checks `isNodeEnv()` and returns:
```ts
{ command, output: '', error: 'shell_exec not available in browser', exitCode: 1 }
```

## What dev must do
Add a unit test that mocks `isNodeEnv()` to return `false` and asserts:
- Promise resolves (does not throw)
- Result has `exitCode: 1` and non-empty `error` string

## Test case
```ts
// mock isNodeEnv to return false
const result = await executeShell({ command: 'echo hi' })
assert(result.exitCode === 1)
assert(result.error.includes('browser'))
```
