# Test Results — task-1775587579874: Fix cp without -r on directory error message

## Summary
- **Status**: PASS
- **Tests run**: 3 (cp-error specific) + 375 (full suite)
- **cp-error tests**: 3/3 passed
- **Full suite**: 370 passed, 5 failed (pre-existing grep-i failures, unrelated)

## Source Code Verification
File: `src/index.ts:812`
```typescript
try { await this.fs.ls(this.resolve(src)); return `cp: ${src}: -r not specified; omitting directory` } catch { /* not a directory */ }
```
✅ Error message updated from generic "is a directory" to UNIX-standard format with "-r not specified; omitting directory"

## Test Results

### cp-error.test.ts — 3/3 passed
| Test | Result |
|------|--------|
| cp dir without -r returns -r not specified error | ✅ PASS |
| cp -r on directory still works | ✅ PASS |
| cp file still works (no regression) | ✅ PASS |

### DBB Criteria Coverage
| DBB ID | Criterion | Status |
|--------|-----------|--------|
| DBB-m25-cp-001 | cp directory without -r returns UNIX-standard error | ✅ VERIFIED |
| DBB-m25-cp-002 | cp -r on directory still works (no regression) | ✅ VERIFIED |
| DBB-m25-cp-003 | cp file still works (no regression) | ✅ VERIFIED |

### Full Suite Regression Check
- 54/55 test files passed
- 1 failure: `test/grep-i-consistency-fix.test.ts` (5 tests) — **pre-existing**, unrelated to cp change
  - Failures are about grep -i streaming fallback, not cp behavior
- No regressions introduced by this change

## Edge Cases Reviewed
- Multiple sources with directory in list: handled (first directory hit returns error)
- cp /dir /dest where /dest is a file: handled before directory check
- Relative vs absolute paths: src preserves original user input in error message
