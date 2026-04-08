# m14 — DBB Compliance Cleanup

## Goals
Close remaining DBB gaps not covered by m13.

## Scope
1. `cp` without `-r` on directory → return error (not silent fallthrough)
2. `wc` output format: space-separated (not tabs), empty file returns `0 0 0`
3. Include `src/index.test.ts` and `test/mkdir-find-cd.test.ts` in vitest run

## Acceptance Criteria
- `cp /dir /dest` returns `cp: /dir: is a directory (use -r)`
- `wc file` outputs space-separated `lines words chars filename`
- `wc` on empty file returns `0 0 0`
- All test files run under vitest; no exclusions
- All existing tests still pass
