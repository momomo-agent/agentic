# Implement background jobs (&) and job control

## Progress

## Status: Complete

## Changes
- Added `jobs` Map and `nextJobId` to `AgenticShell`
- Added `isBackground()` — strips trailing `&`
- Renamed exec body to `execPipeline()`, updated `exec()` to handle `&`
- Added `jobs_cmd()`, `fg()`, `bg()` methods
- Registered `jobs`, `fg`, `bg` in `execSingle()`
- `test/background-jobs-m21.test.ts`: 12 tests, all passing

## Assumptions
- Job promise stores `{ output, exitCode }` (design showed `Promise<string>` but exec returns object)
- `fg` with no args uses highest job id
- `&` with only whitespace returns `exec: missing command` exitCode 1
