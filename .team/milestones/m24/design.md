# Technical Design — m24: PRD Test Coverage & Error Format Fixes

## Overview
Close PRD compliance gaps by adding missing test coverage for 5 implemented features and fixing mkdir error message format. 6 tasks, mostly independent.

## Architecture Context
- All shell logic in `src/index.ts` (single-file architecture)
- Tests use Vitest with mock `AgenticFileSystem`
- Mock pattern: `makeMockFs()` factory with vi.fn() overrides

## Task Summary

### 1. ls Pagination Tests (task-1775587049925)
**Existing**: `test/ls-pagination.test.ts` has 9 tests covering basic pagination
**Gap**: PRD compliance checker may not recognize existing tests, or specific edge cases are missing
**Action**: Verify existing tests pass; add test for `ls -l --page` interaction if missing
**File**: `test/ls-pagination.test.ts`

### 2. find -type Tests (task-1775587050073)
**Existing**: `test/find-recursive.test.ts` has tests for `-type f`, `-type d`, combined `-type f -name`
**Gap**: Same PRD recognition issue
**Action**: Verify existing tests pass; add recursive `-type d` depth test if missing
**Files**: `test/find-recursive.test.ts`, `test/mkdir-find-cd.test.ts`

### 3. rm -r Root Safety Test (task-1775587050164)
**Existing**: `test/rm-recursive.test.ts` DBB-002 tests `rm -r /` refusal
**Gap**: Missing exitCode assertion
**Action**: Add exitCode check to existing test or add companion test
**File**: `test/rm-recursive.test.ts`

### 4. cd-to-File Boundary Test (task-1775587050240)
**Existing**: `test/cd-validation.test.ts` DBB-008 and `test/mkdir-find-cd.test.ts` DBB-008
**Gap**: Missing exitCode assertion
**Action**: Add exitCode check
**File**: `test/cd-validation.test.ts`

### 5. Path Resolution Unit Tests (task-1775587050322)
**Existing**: `test/resolve-path-normalization.test.ts` has 8 tests for `../` behavior
**Gap**: Tests use indirect verification (cd + touch + ls); need direct unit tests for `normalizePath`
**Action**: Create new test file with direct `normalizePath`/`resolve` tests exposing internal methods or using observable behavior
**File**: `test/m24-path-resolution.test.ts` (new)

### 6. mkdir Error Format Fix (task-1775587050399) — **Code Change Required**
**File**: `src/index.ts`, method `mkdir()`, line ~602
**Current**:
```typescript
try { await this.mkdirOne(resolved) } catch (e: any) {
  return `mkdir: cannot create directory '${p}': ${e.message ?? e}`
}
```
**Fixed** (when parent check passes but mkdirOne fails, and parent was verified to exist):
```typescript
try { await this.mkdirOne(resolved) } catch (e: any) {
  return `mkdir: ${p}: No such file or directory`
}
```
**Note**: The parent-exists check at line 598-600 already returns correct format. The catch on line 602 fires when mkdirOne fails for other reasons. The fix standardizes this to UNIX format.
**Tests**: Update `test/mkdir-find-cd.test.ts` DBB-012 assertion.

## Dependencies
- Tasks 1-5 are test-only, fully independent
- Task 6 is the only code change, independent from others
- m23 should complete first for clean test baseline

## Verification
Run `npm test` — all tests should pass with no regressions.
