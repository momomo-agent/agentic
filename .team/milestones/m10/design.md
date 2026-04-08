# M10 Technical Design — Final DBB Compliance & Coverage Verification

## Overview

Four targeted fixes to close DBB gaps. All changes are in `src/index.ts` and `src/index.test.ts` plus `vitest.config.ts`.

## Changes Required

### 1. Coverage threshold enforcement (`vitest.config.ts`)
Add `coverage.thresholds` to vitest config so CI fails programmatically if coverage drops below 80% statement / 75% branch.

### 2. grep error propagation on missing directory (`src/index.ts`)
In `grep()`, when `fs.grep()` returns no results and we check if the path exists, the current logic calls `fs.ls()` then `fs.read()`. If `fs.ls()` throws (non-existent dir), the catch silently sets `lsOk = false` and then reads — but `fs.read()` on a directory path may not return an error. Fix: when `fs.ls()` throws, immediately return the UNIX error without falling through to `fs.read()`.

### 3. ls fs.ls() error field handling (`src/index.ts`)
`AgenticFileSystem.ls()` contract says it throws for non-existent directories, but some adapters may return `{ error }` instead. The `ls()` method currently passes the raw array to mapping with no error check. Add a guard: if the result has an `error` field, return `ls: <path>: <reason>`.

### 4. mkdir .keep fallback removal (`src/index.ts`)
`mkdirOne()` falls back to `write(path + '/.keep', '')` when `fs.mkdir` is absent. Per DBB-M10-003/009, this must be removed. When `fs.mkdir` is unavailable, return `mkdir: not supported by this filesystem`.

## File Paths
- `src/index.ts` — commands: `ls`, `grep`, `mkdir`/`mkdirOne`
- `src/index.test.ts` — new tests for all 4 areas
- `vitest.config.ts` — coverage thresholds
