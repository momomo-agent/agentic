# m24: PRD Gap Verification & Documentation Completion — Technical Design

## Overview
This milestone focuses on verification and gap status updates rather than new implementation. Most PRD gaps described as "missing" have already been addressed in earlier milestones (m15-m23). The primary work is auditing the current codebase against gap descriptions, updating tracker files (prd.json, vision.json), and completing the performance comparison table in README.md.

## Architecture Context

### Gap Tracker Files
- `.team/gaps/prd.json` — tracks 16 PRD gaps with statuses: implemented/partial/missing
- `.team/gaps/vision.json` — tracks 9 vision gaps with statuses: implemented/partial/missing

### Key Source Files Referenced
- `src/backends/agentic-store.ts` — AgenticStoreBackend implementation
- `src/backends/opfs.ts` — OPFSBackend implementation  
- `src/backends/node-fs.ts` — NodeFsBackend implementation
- `src/types.ts` — StorageBackend interface
- `src/errors.ts` — NotFoundError, PermissionDeniedError, IOError
- `test/` — 53+ test files

## Task Summaries

### task-1775612568885: Verify and update PRD gap status
**Verification approach**: Read each gap in prd.json, check the referenced feature against actual source code and test files, update status from "missing"/"partial" to "implemented" where warranted.

**Key checks**:
1. `test/` directory listing — confirm per-backend test files exist
2. `README.md` — confirm it exists with usage examples
3. `src/backends/agentic-store.ts` scan()/scanStream() — check streaming implementation
4. Recalculate match score: count "implemented" gaps / total gaps

**Output**: Updated `.team/gaps/prd.json` with corrected statuses and match score.

### task-1775612568931: Add performance comparison table to README
**Approach**: Add a markdown table to README.md documenting relative performance characteristics of each backend.

**Table structure**:
| Backend | Relative Speed | Memory Usage | Storage Limit | Best For |
|---------|---------------|-------------|---------------|----------|

**Data sources**: ARCHITECTURE.md backend descriptions, known characteristics (Memory=fastest/no persistence, SQLite=persistent/structured, OPFS=browser/fast, etc.)

### task-1775612568973: Verify cross-backend error consistency
**Approach**: Source code inspection of error handling in each backend's get() and delete() methods. Check that:
1. Missing file get() throws NotFoundError (not silent null)
2. Missing file delete() returns false (not throw)
3. No empty catch blocks exist

**Files to inspect**:
- `src/backends/agentic-store.ts` — get(), delete() methods
- `src/backends/node-fs.ts` — get(), delete() methods  
- `src/backends/opfs.ts` — get(), delete() methods

**Output**: Updated prd.json gap status for "backends silently swallow errors".

### task-1775612569013: Verify stat() improvements
**Approach**: Source code inspection of stat() in AgenticStoreBackend and OPFSBackend.

**Key checks**:
1. AgenticStoreBackend.stat() — check if mtime uses stored timestamp or Date.now()
2. OPFSBackend.stat() — check if isDirectory detection is implemented

**Output**: Updated vision.json gap statuses.

## Dependencies
- All 4 tasks are independent and can run in parallel
- Tasks 1, 3, 4 modify gap tracker files — coordinate final match score calculation
- Task 2 modifies README.md only

## Build/Verify
```bash
npx tsup                             # verify build
node --test test/*.test.js           # full test suite passes
# Tasks 1, 3, 4 are verification + JSON updates — no build needed
# Task 2 is documentation only
```
