# Test Result: Document custom provider silent fallback behavior

## Status: PASS

## Verification
- `src/types.ts` lines 15-20: JSDoc on `baseUrl` documents fallback behavior ✓
  - "When provider='custom' and customProvider is not set, this falls back to an OpenAI-compatible adapter automatically."
- All 64 tests pass (npm test)

## Test Count
- Total: 64 | Passed: 64 | Failed: 0
