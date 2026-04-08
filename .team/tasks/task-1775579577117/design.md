# Design: Add default in-memory filesystem to AgenticConfig

## Status
Already implemented in `src/ask.ts:16`. This task is verification + README update.

## What exists
```ts
// src/ask.ts:16
const filesystem = config.filesystem ?? new AgenticFileSystem({ storage: new MemoryStorage() })
```
`AgenticConfig.filesystem` is already optional (`filesystem?: AgenticFileSystem` in `src/types.ts:26`).

## Files to modify

### `README.md`
- Find the `filesystem` field documentation
- Change description to: "Virtual filesystem (optional — defaults to in-memory storage, browser-compatible)"
- Ensure no example requires passing `filesystem` for basic file tool usage

## Verification
- `ask({ prompt: "write 'hello' to test.txt then read it back", apiKey: "...", tools: ['file'] })` must succeed without `filesystem`
- No `Error` thrown about missing filesystem

## Edge cases
- If `config.filesystem` is `null` (not `undefined`), the `??` operator will NOT default — callers must pass `undefined` or omit the field. This is acceptable TypeScript behavior.

## Test cases
1. Call `ask()` with `tools: ['file']` and no `filesystem` → succeeds, file round-trip works
2. Call `ask()` with explicit `filesystem` → custom instance is used (not default)
