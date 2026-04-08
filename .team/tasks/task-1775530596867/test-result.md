# Test Result: Fix images field lost in final return path

## Status: BLOCKED

## Summary
The implementation fix is correct (`images: allImages` at line 35 of ask.ts), but tests cannot verify it due to a blocking bug in the custom provider implementation.

## Test Execution Results
```
npm test
Exit code: 1
Total: 26 tests
Passed: 16 tests
Failed: 10 tests
```

## Blocking Issue
**Root Cause:** `src/providers/provider.ts:63` requires `baseUrl` when `provider="custom"`, but doesn't check for `customProvider` first.

**Error:** `baseUrl is required when provider="custom"`

**Affected Tests:**
- test/ask-images.test.ts (2 tests) - DBB-003, DBB-004
- test/ask-system-prompt.test.ts (2 tests)
- test/ask-system-prompt-multiround.test.ts (1 test)
- test/ask-loop.test.ts (2 tests)
- test/custom-provider.test.ts (2 tests)
- test/m2-provider-apikey.test.ts (1 test)

## Implementation Verification
✅ Code review confirms fix is correct:
- Line 35: `images: allImages,` (unconditional)
- Line 94: `if (result.images) acc.allImages.push(...result.images)`
- Images are collected during tool rounds and always returned

## Dependency
This task is blocked by **task-1775530933189** (Implement custom provider support).

The custom provider implementation must check for `config.customProvider` before requiring `baseUrl`:

```typescript
case 'custom':
  if (config.customProvider) return config.customProvider  // Use provided mock/custom provider
  if (!config.baseUrl) throw new Error('baseUrl is required when provider="custom"')
  if (!config.apiKey) throw new Error('apiKey is required when provider="custom"')
  return createOpenAIProvider(config)
```

## Recommendation
1. Fix task-1775530933189 first (custom provider support)
2. Re-run tests for this task after that fix is merged
3. Expected outcome: All 26 tests should pass
