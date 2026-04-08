# DBB Check — Milestone m14

**Milestone**: DBB Compliance Cleanup
**Match**: 88%
**Date**: 2026-04-08

## Summary

3 of 4 criteria pass. cp error format, wc tab separators, and wc empty file behavior all verified. One partial: `src/index.test.ts` is excluded from the default vitest run (vitest.config.ts exclude list). `test/mkdir-find-cd.test.ts` also excluded but runs via `vitest.excluded.config.ts`.

## Criteria Results

| Criterion | Status | Evidence |
|-----------|--------|----------|
| cp dir without -r returns error | pass | Line 894: `cp: ${src}: -r not specified; omitting directory`. Confirmed by cp-error.test.ts. |
| cp -r still works | pass | copyRecursive() lines 901-923. cp-error.test.ts confirms exitCode 0. |
| wc default uses tabs | pass | Lines 966-969: `${lines}\t${words}\t${chars}\t${path}` — all use tab separator |
| All test files in vitest run | partial | src/index.test.ts excluded in vitest.config.ts line 15. mkdir-find-cd.test.ts excluded line 16 but has separate config. |

## Known Gap

`src/index.test.ts` is excluded from the default `vitest run` (1052 lines of mock-based tests). This file runs if explicitly targeted but not in the default suite. Impact: test count from default run may not include all unit tests.
