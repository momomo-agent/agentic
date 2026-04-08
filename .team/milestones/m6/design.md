# M6 Technical Design: Quality Polish & Release Readiness

## Approach

Two tasks:
1. Fix timing-dependent race condition test in `test/concurrent.test.ts`
2. Create `CHANGELOG.md` at project root

## Task Breakdown

### Task 1: Fix race condition test
The `write-delete-write race condition` test at line 201 of `test/concurrent.test.ts` fires three operations concurrently with `Promise.all`. For NodeFsBackend, the OS may schedule these in any order, making the assertion `content === 'v2'` flaky.

Fix: run the operations sequentially (not concurrently) to guarantee ordering, or relax the assertion to accept any valid final state (null, 'v1', or 'v2').

### Task 2: CHANGELOG.md
Create `CHANGELOG.md` at project root documenting m1–m5 features in Keep a Changelog format.

## Files Affected
- `test/concurrent.test.ts` — fix race condition test
- `CHANGELOG.md` — create at project root
