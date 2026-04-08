# Design — Include excluded test files in vitest run

## File
`vitest.config.ts`

## Change
Remove the two test file exclusions from the `exclude` array:

```typescript
exclude: [
  '**/node_modules/**',
  '**/dist/**',
  // removed: 'src/index.test.ts',
  // removed: 'test/mkdir-find-cd.test.ts',
],
```

## Edge cases
- If `src/index.test.ts` or `test/mkdir-find-cd.test.ts` have pre-existing failures, fix them before marking this task done.
- Coverage thresholds remain unchanged (statements ≥80%, branches ≥75%).

## Test cases
- `vitest run` executes tests from both previously-excluded files
- All tests pass
