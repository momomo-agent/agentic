# Test Result: Add apiKey validation in detectProvider

## Status: BLOCKED

## Summary
The apiKey validation implementation is correct and partially working. 2 out of 3 tests pass, but 1 test is blocked by the custom provider bug.

## Test Execution Results
```
npm test -- test/m2-provider-apikey.test.ts
Exit code: 1
Total: 3 tests
Passed: 2 tests
Failed: 1 test
```

## Passing Tests ✅
- **DBB-014**: throws on missing apiKey - PASS
- **DBB-015**: throws on empty string apiKey - PASS

## Failing Tests ❌
- **DBB-016**: valid apiKey proceeds - FAIL
  - Error: `baseUrl is required when provider="custom"`
  - Root cause: Same custom provider bug as task-1775530596867

## Implementation Verification
✅ Code review confirms validation is correctly implemented in `src/providers/provider.ts`:

**Lines 46-48:** Missing apiKey check
```typescript
if (provider !== 'custom' && !config.apiKey) {
  throw new Error('apiKey is required for provider: ' + provider)
}
```

**Lines 50-55:** Format validation
```typescript
if (provider === 'anthropic' && config.apiKey && !config.apiKey.startsWith('sk-ant-')) {
  throw new Error('Invalid apiKey format for anthropic provider (expected sk-ant- prefix)')
}
if (provider === 'openai' && config.apiKey && !config.apiKey.startsWith('sk-')) {
  throw new Error('Invalid apiKey format for openai provider (expected sk- prefix)')
}
```

## Blocking Issue
**Root Cause:** `src/providers/provider.ts:63` requires `baseUrl` when `provider="custom"`, but doesn't check for `customProvider` first.

**Dependency:** This task is blocked by **task-1775530933189** (Implement custom provider support).

## DBB Verification Against M6

### DBB-003: detectProvider throws on missing apiKey ✅
- Requirement: Clear error when `apiKey` is absent
- Status: PASS (DBB-014 test confirms)

### DBB-004: detectProvider throws on invalid apiKey format ✅
- Requirement: Clear error when `apiKey` has wrong format
- Status: IMPLEMENTED (lines 50-55), but cannot fully verify due to blocking bug
- Note: Empty string is caught by DBB-015 test

### DBB-005: All existing tests continue to pass ❌
- Requirement: No regressions
- Status: BLOCKED - 10 tests failing due to custom provider bug

## Edge Cases Identified
- Empty string apiKey: Correctly caught ✅
- Missing apiKey with custom provider: Should skip validation (needs verification after fix)
- Invalid format with valid prefix substring (e.g., "sk-ant-fake"): Passes validation, fails at network (expected behavior)

## Recommendation
1. Fix task-1775530933189 first (custom provider support)
2. Re-run tests for this task after that fix is merged
3. Expected outcome: All 3 tests should pass
