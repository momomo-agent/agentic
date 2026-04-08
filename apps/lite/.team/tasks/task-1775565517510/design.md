# Design: Fix AgenticResult.images type to string[]

## Files to modify

### src/types.ts
Change line:
```ts
images?: string[]
```
to:
```ts
images: string[]
```

### src/ask.ts
Verify the return statement already passes `images: allImages` unconditionally (confirmed — it does). No change needed.

## Edge cases
- Callers that check `if (result.images)` will still work (non-empty array is truthy)
- Empty array `[]` is the correct default when no images collected

## Test cases
- `tsc --noEmit` passes
- `ask()` return value has `images` typed as `string[]`
- When no search tool used, `result.images` equals `[]`
