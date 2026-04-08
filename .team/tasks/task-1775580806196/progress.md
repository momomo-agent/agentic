# Enforce vitest coverage gate

## Progress

- Verified `vitest.config.ts` already has thresholds: statements:80, branches:75
- Attempted to remove `src/index.test.ts` from exclude per design — causes heap OOM (FATAL ERROR), reverted
- `src/index.test.ts` must stay excluded due to memory constraints
- Current test count: 263 passing (threshold: 148 ✓)
- Coverage thresholds enforced in config ✓
