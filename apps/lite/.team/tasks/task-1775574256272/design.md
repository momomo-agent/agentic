# Design: Fix AgenticResult.usage to required type

## File to modify
- `src/types.ts`

## Current state
`usage: { input: number; output: number }` — already required (no `?`).

## Algorithm
1. Read `src/types.ts`
2. Find `AgenticResult` interface
3. If `usage?:` exists, change to `usage:`
4. If already `usage:`, no change needed

## Expected result
```ts
usage: { input: number; output: number }
```

## Test cases
```
grep 'usage?' src/types.ts   # must return no match
grep 'usage:' src/types.ts   # must match
```
