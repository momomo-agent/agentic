# Technical Design: Add Test Coverage Quality Gate Measurement

## Problem

PRD requires ≥80% statement coverage and ≥75% branch coverage (ARCHITECTURE.md §Coverage Goals). The project has `@vitest/coverage-v8` as a devDependency and a `test:coverage` script in package.json, but coverage thresholds are not enforced and actual coverage numbers are not verified.

## Scope

Configure Vitest coverage thresholds and verify the current test suite meets them.

## Files to Modify/Create

- `vitest.config.ts` (create if not exists, or modify existing)

## Implementation

### 1. Create/Update vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      thresholds: {
        statements: 80,
        branches: 75,
      },
    },
  },
})
```

### 2. Run coverage and verify

Execute: `npm run test:coverage`

Expected: Coverage report shows:
- Statement coverage ≥ 80%
- Branch coverage ≥ 75%
- Total test count ≥ 148

### 3. If thresholds fail

If coverage is below thresholds, the developer must either:
- Add missing tests to reach the threshold, OR
- Report the gap and escalate if the gap is large (>5%)

## Edge Cases

- If `vitest.config.ts` already exists, merge coverage config into existing config
- The `thresholds` feature in Vitest will cause `test:coverage` to exit with non-zero code if thresholds are not met, which acts as a CI gate

## Dependencies

- `@vitest/coverage-v8` (already in devDependencies)

## Verification

- Run `npm run test:coverage` and confirm:
  - No threshold violation errors
  - Statement coverage ≥ 80%
  - Branch coverage ≥ 75%
  - Test count ≥ 148
