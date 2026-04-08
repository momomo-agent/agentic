# M9 Technical Design — Test Coverage & Documentation Completeness

## Overview

Milestone m9 focuses on completing test coverage across all backends and verifying documentation accuracy.

## Current State Analysis

### Existing Test Files
- `test/cross-backend.test.js` — exists but only tests 2 backends (NodeFs, AgenticStore)
- `test/edge-cases.test.js` — exists but only tests 4 backends (NodeFs, AgenticStore, Memory, LocalStorage)
- Missing coverage: OPFSBackend and SQLiteBackend in both test files

### README Documentation
- Performance table (lines 32-39) — **already complete** with all required columns
- Browser support matrix (lines 47-54) — **already complete**
- Custom storage example (line 173) — **already correct** with `line: number` field

## Work Required

### Task 1: Expand cross-backend.test.js
**File:** `test/cross-backend.test.js`

**Changes needed:**
1. Add OPFSBackend to the test suite (requires JSDOM or browser environment mock)
2. Add SQLiteBackend to the test suite (requires better-sqlite3)
3. Update `makeBackends()` function to return all 6 backends

**Implementation approach:**
- For OPFSBackend: Mock the File System Access API or skip in Node.js environment
- For SQLiteBackend: Use in-memory SQLite database for testing

### Task 2: Expand edge-cases.test.js
**File:** `test/edge-cases.test.js`

**Changes needed:**
1. Add OPFSBackend to the test suite
2. Add SQLiteBackend to the test suite
3. Ensure all edge cases run against all 6 backends

**Edge cases already covered:**
- Special characters in filename
- Unicode filename
- Newline in content
- Overwrite
- Concurrent writes same key
- Concurrent independent writes
- Scan multiline
- List after delete
- Empty path rejected
- Concurrent writes 10+ files

### Task 3: Verify README documentation
**File:** `README.md`

**Verification needed:**
- Confirm performance table completeness (lines 32-39)
- Confirm browser support matrix completeness (lines 47-54)
- Confirm scan() signature correctness (line 173)

**Expected outcome:** Documentation is already complete, no changes needed.

## Dependencies

- OPFSBackend testing may require browser environment or mocking
- SQLiteBackend testing requires better-sqlite3 package
- All tests must pass in CI/CD environment

## Success Criteria

1. `test/cross-backend.test.js` tests all 6 backends
2. `test/edge-cases.test.js` tests all 6 backends
3. All tests pass with `npm test`
4. README documentation verified as complete and accurate
