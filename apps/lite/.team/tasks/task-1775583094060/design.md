# Task Design — Fix README AgenticResult.images type annotation

## Goal
Ensure `README.md` documents `images: string[]` (required, not optional) in the `AgenticResult` type block.

## Files
- `README.md` — verify line with `images` field; fix if it shows `images?: string[]`

## Steps
1. Check `src/types.ts` — confirm `images: string[]` (source of truth)
2. Check `README.md` — find `images` in `AgenticResult` block
3. If `images?:` or `images?: string[]` found → change to `images: string[]`
4. If already `images: string[]` → no change needed

## Verification
- `grep "images" README.md` → must output `images: string[]`
- `npm test` → all tests pass
