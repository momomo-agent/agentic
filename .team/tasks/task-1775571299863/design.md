# Design: Fix AgenticResult.usage and images types

## File to Modify
- `src/types.ts`

## Changes

1. `usage` field: remove `?` — change `usage?: { input: number; output: number }` to `usage: { input: number; output: number }`
2. `images` field: already `string[]` in current types.ts — verify no `| undefined` present; no change needed if already correct

## Edge Cases
- Any call site that treats `usage` as optional must be updated to always provide it
- Check `src/ask.ts` return statement includes `usage` in all code paths

## Test Cases
- TypeScript compiles without error (`npm run build`)
- `result.usage.input` accessible without null check
