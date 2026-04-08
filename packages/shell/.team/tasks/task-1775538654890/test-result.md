# Test Result: rm 修复 fs.delete 调用

## Task: task-1775538654890
## Tester: tester-2
## Date: 2026-04-07

## Summary
**New tests: 4 passed, 0 failed**
**Full suite: 84 passed, 4 failed (pre-existing bugs)**

## New Tests (test/rm-delete-fix.test.ts)

| Test | Result |
|------|--------|
| rm file.txt calls fs.delete with resolved path | ✓ PASS |
| rm relative path resolves and calls fs.delete | ✓ PASS |
| rm nonexistent returns No such file or directory | ✓ PASS |
| rm -r calls fs.delete recursively | ✓ PASS |

## DBB-003 Verification
- `rm file.txt` → `fs.delete('/tmp/file.txt')` called ✓
- `rm -r dir/` → `fs.delete` called for all children and dir ✓
- `rm nonexistent` → returns `No such file or directory` ✓
- Implementation uses `fs.delete` (not `remove`/`unlink`) — correct ✓

## Pre-existing Failures (NOT caused by this task)

### 1. rm-recursive.test.ts > DBB-003: rm without -r on directory
- **Bug**: `rm /tmp/dir` returns `''` instead of `rm: /tmp/dir: is a directory`
- **Root cause**: When mock `read` returns `{content:'',error:null}`, code treats empty string as valid file content and skips directory check
- **Fix needed**: In `rm()`, check `r.content !== null && r.content !== undefined && r.content !== ''` or check ls result more robustly

### 2. dbb.test.ts > DBB-003: grep -r on non-existent directory
- **Bug**: `grep -r pattern /nonexistent` returns `''` instead of error
- **Root cause**: `fs.grep` mock returns `[]` with no error; implementation doesn't validate directory existence before grep

### 3. dbb.test.ts > DBB-009: rm nonexistent returns error
- **Bug**: `rm /nonexistent` returns `''` when `read` returns `{content:null,error:'No such file'}` and `ls` returns `[]`
- **Root cause**: `lsThrew=false` (ls succeeds with empty array) and `r.error` is truthy → skips "is a directory" check → calls `fs.delete` which succeeds silently

### 4. dbb.test.ts > DBB-017: path resolution test
- **Bug in test**: Expects `fs.read` called with `/./subdir/../file.txt` (unnormalized), but `resolve()` correctly normalizes to `/file.txt`
- **Note**: This test was written before task-1775538654925 (resolve() fix) was applied. The test expectation is wrong — it documents old broken behavior. Should be updated to expect `/file.txt`.

## Edge Cases Identified
- `rm` with empty string content from `read` is ambiguous — could be empty file or directory
- `rm` nonexistent file: if `ls` doesn't throw, delete is called silently with no error
- `grep -r` doesn't validate directory existence before searching
