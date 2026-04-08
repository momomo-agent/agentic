# Test Result — Make apiKey optional for custom provider

## Summary
- Tests: 3 passed, 0 failed

## Results
- DBB-001: custom provider succeeds without apiKey ✅
- DBB-002: anthropic throws before network call when no apiKey ✅
- DBB-003: openai throws before network call when no apiKey ✅

## Implementation Verified
- `src/types.ts`: `apiKey?: string` (optional) ✅
- `src/providers/anthropic.ts`: throws `apiKey is required for anthropic provider` ✅
- `src/providers/openai.ts`: throws `apiKey is required for openai provider` ✅

## Edge Cases
- No untested edge cases identified
