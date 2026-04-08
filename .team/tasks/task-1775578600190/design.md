# Design: Verify coverage gate and test count threshold

## Files
- `vitest.config.ts` — add coverage thresholds
- `src/index.test.ts` — verify test count ≥ 148

## Current state
`vitest.config.ts` likely has `coverage` config but no `thresholds` block enforcing minimums.

## Change to vitest.config.ts
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'lcov'],
  thresholds: {
    statements: 80,
    branches: 75,
  }
}
```

## Verification steps
1. Run `npx vitest --coverage` — confirm output shows ≥ 80% statements, ≥ 75% branches
2. Count tests: `npx vitest --reporter=verbose 2>&1 | grep -c '✓'` — confirm ≥ 148
3. If thresholds not met, identify uncovered branches and add targeted tests

## Edge cases
- If current coverage is below threshold, do NOT lower thresholds — add tests instead
- `thresholds` causes vitest to exit non-zero if not met (CI gate behavior)

## Test cases
No new unit tests needed — this task is configuration + verification.
If coverage is below gate, add tests for uncovered branches identified by the report.
