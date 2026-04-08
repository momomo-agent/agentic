# Design: Shell exec browser safety

## Files to Modify
- `src/tools/shell.ts` — already handles browser gracefully (returns error, no crash)
- `README.md` — add Node.js-only note for shell_exec

## Current State
`executeShell()` already returns `{ error: 'shell_exec not available in browser', exitCode: 1 }` when `!isNodeEnv()`. No code change needed.

## README Change
In the shell_exec tool section, add:
> **Note:** `shell_exec` is Node.js-only. In browser environments it returns a descriptive error instead of crashing.

## Edge Cases
- No crash path exists; `isNodeEnv()` guard is already in place
- `shellToolDef` is only registered when `isNodeEnv()` is true (`ask.ts:buildToolDefs`)
