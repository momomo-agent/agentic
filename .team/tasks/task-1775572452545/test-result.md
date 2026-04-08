# Test Result: task-1775572452545 — Resolve vitest OOM for excluded tests

## Status: BLOCKED

## Summary

Implementation created `vitest.excluded.config.ts` but did not add `test:heavy` or `test:all` scripts to `package.json` as specified in the design. More critically, the OOM issue persists — the heavy config also crashes with "Worker exited unexpectedly" before any tests execute.

## Test Results

| Test | Result |
|------|--------|
| Default `vitest run` (no regression) | PASS — 236 passed, 2 pre-existing failures (exit-codes task-1775571373147) |
| `vitest run --config vitest.excluded.config.ts` | FAIL — Worker exited unexpectedly (OOM) |
| DBB-env-001: all test files execute in vitest run | FAIL — excluded files still OOM |

## Root Cause (confirmed)

Node 25.4.0 + vitest 2.1.9 worker bootstrap OOMs before any test code runs. Confirmed across all pool configurations (`forks`, `threads`, `vmThreads`, `vmForks`). The `--max-old-space-size=8192` flag does not prevent the crash.

## Implementation Gaps

1. `package.json` missing `test:heavy` and `test:all` scripts (design requirement)
2. `vitest.excluded.config.ts` only includes `test/mkdir-find-cd.test.ts`, not `src/index.test.ts` (design requires both)
3. Core OOM issue unresolved — DBB-env-001 cannot be satisfied

## Blocker

vitest 2.1.9 is incompatible with Node 25.4.0. Resolution requires either:
- Upgrading vitest to a version compatible with Node 25, OR
- Downgrading Node to v20/v22 LTS
