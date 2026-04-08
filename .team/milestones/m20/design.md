# m20 — Technical Design

## Overview
Four tasks addressing test quality and PRD compliance gaps: grep -i correctness, path resolution test coverage, performance benchmarks, and coverage gate enforcement.

## Task Breakdown

### 1. Fix grep -i multi-file (task-1775580789278)
**Problem**: `src/index.ts:353` calls `fs.grep('')` when `-i` is set, then post-filters. This is wrong — `fs.grep` should receive the actual pattern; case-insensitivity is a post-filter concern.
**Fix**: Always pass `pattern` to `fs.grep()`. Apply `RegExp(pattern, 'i')` filter afterward when `-i` is set.

### 2. Path resolution unit tests (task-1775580794745)
**File**: `src/index.test.ts` — add `describe('path resolution')` block testing `normalizePath` and `resolve` via shell behavior (cd + pwd or direct method exposure).

### 3. Performance benchmark suite (task-1775580800582)
**File**: `src/perf.test.ts` — new file using `performance.now()` assertions. Generates large MockFileSystem fixtures inline.

### 4. Enforce coverage gate (task-1775580806196)
**File**: `vitest.config.ts` — verify thresholds already present (they are). Ensure `src/index.test.ts` is not excluded from the main test run that counts toward coverage.
