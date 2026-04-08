# m16 — Technical Design: PRD Compliance & Coverage Gate

## Overview
Four independent fixes/features targeting PRD compliance gaps identified in m13/m14 reviews.

## Tasks

### 1. Fix grep -i non-streaming path (task-1775573395861)
**Problem**: `fs.grep(pattern)` is called without case-insensitive flag — the FS layer does exact regex match. The shell post-filters with `-i` regex, but `fs.grep()` may miss results if the FS implementation is case-sensitive.

**Fix**: In `grep()` multi-path branch (`src/index.ts:329`), pass a case-insensitive pattern to `fs.grep()` when `-i` is set, OR always post-filter with the regex (current approach at line 334-336 is correct). The real bug is that `fs.grep(pattern)` uses the raw pattern — if FS does case-sensitive match, results are pre-filtered before the shell's `-i` re-filter. Fix: when `-i`, call `fs.grep(pattern)` with the pattern wrapped to be case-insensitive, or rely solely on post-filter by calling `fs.grep('')` (match all) and filtering in shell. Simplest correct fix: always post-filter; call `fs.grep(pattern)` but then re-filter with the regex regardless of `-i`.

### 2. Fix wc -l output format (task-1775573404564)
**Problem**: `wc -l` returns `String(lines)` (just the count). UNIX standard is `<count> <filename>`.

**Fix**: Change `src/index.ts:632` from `return String(lines)` to `return \`${lines} ${path}\``.

### 3. Fix touch on existing empty file (task-1775573404601)
**Problem**: `src/index.ts:597` — `if (r.content == null)` — this correctly uses `== null` (catches both `null` and `undefined`). Wait — the task says `!r.content` is truthy for empty string. Check actual code: line 597 uses `r.content == null`. If this is already correct, the bug may be elsewhere or the task description refers to a prior version. Design: verify condition is `r.content == null` (not `!r.content`), add regression test.

### 4. Enforce vitest coverage gate (task-1775573404635)
**Problem**: Thresholds exist in `vitest.config.ts` but `coverage` is only run with explicit `--coverage` flag. CI script may not include it.

**Fix**: Verify `package.json` test script includes `--coverage`, or add a separate `test:ci` script. Add test count assertion comment in README.

## Files Modified
- `src/index.ts` — grep multi-path fix, wc -l format fix, touch condition verify
- `vitest.config.ts` — confirm thresholds present (already are)
- `package.json` — ensure coverage in test script
- `src/index.test.ts` — new tests for each fix
