# Technical Design — m26: PRD Bug Fixes & Performance Gates

## Overview
Fix grep -i inconsistency across code paths and add performance benchmark tests.

## Task 1: Fix grep -i Multi-File/Recursive Inconsistency

### Problem
The `grep` method (src/index.ts:432-493) has inconsistent `-i` handling:
- **Single-file path** (line 457-470): Uses `grepStream()` which correctly applies `-i` via regex
- **Multi-file/recursive path** (line 472-492): Calls `this.fs.grep(pattern)` with the raw pattern (case-sensitive), then post-filters with case-insensitive regex
- **Impact**: `-l` and `-c` flags in multi-file path report wrong results because they use `filtered.length` (post-filter count), but `fs.grep()` may return results that get filtered out by `-i` post-filter. The count after filtering is correct, but the approach is fragile and inconsistent.

### Root Cause
`fs.grep(pattern)` performs case-sensitive matching at the filesystem level. When `-i` is used:
- **Single-file path** (line 457-470): Works correctly — uses `grepStream()` which applies case-insensitive regex on each line
- **Multi-file/recursive path** (line 472-493): **BROKEN** — calls `fs.grep(pattern)` which does case-Sensitive matching, then post-filters with case-insensitive regex. But if `fs.grep()` didn't return a result (because case-sensitive didn't match), the post-filter can't recover it.

Example: `grep -i hello /a.txt` where `/a.txt` contains "HELLO world"
- `fs.grep("hello")` returns `[]` (case-sensitive, no match)
- Post-filter: nothing to filter
- Result: empty (WRONG — should match "HELLO world")

### Fix
When `-i` flag is present, skip `fs.grep()` and use file-by-file reading with case-insensitive regex matching (same approach as `grepStream` fallback). Apply to both multi-file and recursive paths.

**Algorithm**:
1. Resolve list of files to search (from explicit paths or recursive directory listing)
2. For each file, call `fs.read()` to get content
3. Apply case-insensitive regex line-by-line
4. Collect results in standard format `{path, line, content}`
5. Apply `-l` / `-c` formatting on the collected results

### Files to Modify
- `src/index.ts` — `grep()` method, lines 472-493

### Edge Cases
- `-i` with `-l` in multi-file mode: return unique file paths
- `-i` with `-c` in multi-file mode: return total case-insensitive match count
- `-i` with `-r` recursive: search all files under directory case-insensitively
- Empty results with `-i`: return empty string (no error)
- Invalid regex with `-i`: still catch and return error

## Task 2: Fix rm -r Deep Nesting

### Finding: Already Iterative
The current `rmRecursive` implementation (src/index.ts:610-629) is **already iterative** using a stack-based approach with a `visited` Set for cycle detection. It does NOT use recursion.

The task description states "rmRecursive uses recursion with no depth guard" but this is inaccurate. The code uses:
- `const stack: string[] = [path]` — iterative stack
- `while (stack.length)` — loop instead of recursion
- `visited` Set — cycle detection

**Action**: Verify with a deep-nesting test (20+ levels) to confirm no issues. If the iterative implementation is confirmed robust, this task becomes a test-only change: add depth tests and close the PRD gap.

### Files to Modify (if needed)
- `src/index.ts` — `rmRecursive()` method, lines 610-629 (likely no changes needed)
- `src/index.test.ts` — add deep nesting tests

## Task 3: Cross-Environment Consistency Tests

### Problem
Existing cross-env tests (src/index.test.ts:484-582) cover basic operations but miss:
- Error format normalization across backends
- Glob expansion behavior consistency
- Edge cases with different `read()` error message formats

### Approach
Expand `runConsistencyTests()` in `src/index.test.ts` to cover:
1. Glob expansion: `cat *.txt` returns same results across envs
2. Error normalization: `cat /missing` returns same format regardless of backend error message
3. Pipe behavior: `cat file | grep pattern` consistent
4. Edge cases: empty files, empty directories, permission errors

### Files to Modify
- `src/index.test.ts` — expand `runConsistencyTests()` function

## Task 4: Performance Benchmarks

### Approach
Create a new describe block in `src/index.test.ts` with timing-based assertions:
1. Generate large mock filesystems in-memory
2. Use `performance.now()` to measure operation duration
3. Assert with generous thresholds (2x the stated PRD requirement)

### Implementation
- **grep benchmark**: Create MockFileSystem with 20K-line content, time `grep pattern /bigfile`
- **find benchmark**: Create MockFileSystem with 1000 entries, time `find /bigdir`
- **ls pagination benchmark**: Create MockFileSystem with 500 entries, time `ls --page 1 --page-size 20 /bigdir`

### Files to Modify
- `src/index.test.ts` — add `describe('performance benchmarks', ...)`
