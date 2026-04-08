# Design — Coverage threshold enforcement

## Files to modify
- `vitest.config.ts`

## Change
Add `coverage` block with thresholds to the existing `test` config:

```typescript
test: {
  // ...existing config...
  coverage: {
    provider: 'v8',
    thresholds: {
      statements: 80,
      branches: 75,
    },
  },
}
```

Note: current config has `exclude` that skips `src/index.test.ts` and `test/mkdir-find-cd.test.ts` — the coverage run must NOT exclude these files, so the coverage block should use a separate include or remove those from exclude when running with coverage.

## Logic
- `vitest run --coverage` exits non-zero if thresholds not met
- No source changes needed

## Edge cases
- Existing `exclude` list skips main test files — coverage config must include them (use `include: ['src/**']` under coverage, not under test.exclude)

## Test cases
- `vitest run --coverage` exits 0 (thresholds met)
- `vitest.config.ts` contains `thresholds.statements: 80` and `thresholds.branches: 75`
