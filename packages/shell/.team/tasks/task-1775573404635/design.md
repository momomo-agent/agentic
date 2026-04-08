# Design: Enforce vitest coverage gate

## Problem
`vitest.config.ts` has coverage thresholds defined but `src/index.test.ts` and `test/mkdir-find-cd.test.ts` are in the `exclude` list, so coverage runs on no test files — thresholds pass vacuously.

## Files to Modify
- `vitest.config.ts` — remove test file exclusions, keep only `node_modules` and `dist`

## Fix

```typescript
// vitest.config.ts — change exclude from:
exclude: [
  '**/node_modules/**',
  '**/dist/**',
  'src/index.test.ts',
  'test/mkdir-find-cd.test.ts',
],
// To:
exclude: [
  '**/node_modules/**',
  '**/dist/**',
],
```

This makes `pnpm vitest run --coverage` include all test files. The existing thresholds (`statements: 80`, `branches: 75`) will then gate the build.

## Test Count Assertion
No code change needed — vitest prints test count in output. The DBB requires ≥148 tests; verify by running `pnpm vitest run` and checking the summary line.

## README Documentation
Add to README (or CONTRIBUTING.md):
```
## Coverage Gate
Run `pnpm vitest run --coverage` to verify coverage thresholds:
- Statement coverage ≥ 80%
- Branch coverage ≥ 75%
- Test count ≥ 148
```

## Edge Cases
- If removing exclusions causes OOM: the `pool: 'forks'` + `singleFork: true` + `--max-old-space-size=8192` config already handles this
- If coverage drops below threshold: vitest exits non-zero, blocking CI

## Test Cases
No unit tests needed — this is a config change. Verify by running:
```
pnpm vitest run --coverage
```
Expected: exits 0 with ≥148 tests passing and coverage above thresholds.

## Dependencies
- `vitest.config.ts` pool config (already set to `forks` with memory limit)
