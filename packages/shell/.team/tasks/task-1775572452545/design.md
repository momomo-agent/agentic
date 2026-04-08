# Design: Resolve vitest OOM — run excluded tests with --pool=forks

## Problem
`src/index.test.ts` and `test/mkdir-find-cd.test.ts` are excluded from the default vitest run due to OOM crashes. They must be included in CI coverage without crashing.

## Current State
`vitest.config.ts` already uses `pool: 'forks'` with `singleFork: true` and `--max-old-space-size=8192`, but still excludes the two large test files.

## Approach
Add a second vitest config (`vitest.config.heavy.ts`) for the excluded tests, running them in a separate process with tighter memory controls. The default config remains unchanged. CI runs both configs sequentially.

## Files to Modify/Create

### `vitest.config.heavy.ts` (create)
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        execArgv: ['--max-old-space-size=4096', '--gc-interval=100'],
      },
    },
    maxConcurrency: 1,
    sequence: { concurrent: false },
    include: ['src/index.test.ts', 'test/mkdir-find-cd.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
    },
  },
})
```

### `package.json` — add scripts
```json
"test:heavy": "vitest run --config vitest.config.heavy.ts",
"test:all": "vitest run && vitest run --config vitest.config.heavy.ts"
```

## Algorithm
1. Default `vitest run` executes all tests except the two excluded files (unchanged).
2. `vitest run --config vitest.config.heavy.ts` runs only the two heavy files in a single fork with GC pressure relief.
3. CI calls `test:all` (sequential, not parallel) to avoid combined memory pressure.

## Edge Cases
- If `--max-old-space-size=4096` still OOMs, reduce to `2048` and split the two files into separate config entries.
- `--gc-interval=100` forces GC every 100 allocations to keep heap low during large test suites.
- Coverage from both runs is independent; merge is not required for threshold checks since `src/index.ts` is covered by the heavy run.

## Test Cases to Verify
1. `npm run test:heavy` completes without OOM exit code.
2. `src/index.test.ts` tests all pass.
3. `test/mkdir-find-cd.test.ts` tests all pass.
4. Default `vitest run` still passes (no regression from adding the new config).
