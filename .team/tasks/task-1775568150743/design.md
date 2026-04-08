# Design: Fix AgenticResult.usage type to required

## File to modify
- `src/types.ts`

## Change
```ts
// Before
usage?: { input: number; output: number }

// After
usage: { input: number; output: number }
```

## Rationale
`ask()` in `src/ask.ts` always initializes `totalUsage = { input: 0, output: 0 }` and always returns `usage: totalUsage`. The optional marker is incorrect.

## Edge cases
- No callers need updating — changing optional to required is backwards-compatible for consumers reading the field
- Any code doing `result.usage?.input` still works; TypeScript will just no longer require the null-check

## Test cases
- `npm run build` passes with no type errors
- Existing tests pass
