# Design: Enforce vitest coverage gate

## Files to Verify/Modify
- `vitest.config.ts` — confirm thresholds present (already confirmed: statements:80, branches:75)
- `vitest.config.ts` — fix: `src/index.test.ts` is currently in `exclude` list, preventing it from running in the default config

## Problem
`vitest.config.ts` excludes `src/index.test.ts` from the test run. This means the main test file doesn't count toward the 148+ test threshold and coverage is measured without it.

## Fix
Remove `src/index.test.ts` from the `exclude` array in `vitest.config.ts`:

```typescript
// Before:
exclude: [
  '**/node_modules/**',
  '**/dist/**',
  'src/index.test.ts',           // <-- remove this line
  'test/mkdir-find-cd.test.ts',
],

// After:
exclude: [
  '**/node_modules/**',
  '**/dist/**',
  'test/mkdir-find-cd.test.ts',
],
```

Also remove `src/index.test.ts` from `coverage.exclude` if present (currently it is — keep that exclusion since test files shouldn't count toward coverage source).

## Verification
- Run `vitest --coverage` and confirm test count >= 148
- Confirm coverage thresholds pass
- Confirm CI fails if thresholds drop below gate

## Edge Cases
- If removing the exclude causes pool/concurrency issues, adjust `maxConcurrency`
- `test/mkdir-find-cd.test.ts` stays excluded (known flaky/legacy)
