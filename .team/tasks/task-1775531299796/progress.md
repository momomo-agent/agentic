# 增强 grep 命令

## Progress

- Added `-r`/`-R` recursive flag support (defaults to cwd when no path given)
- Added `-l` flag for file list only
- Added `-c` flag for count
- Fixed empty result returning `''`
- Removed dead `prefix` variable

## Implementation Complete

All features from design.md are implemented:
- `-r`/`-R` recursive search with path filtering
- `-l` file list output
- `-c` count output
- Default to cwd when recursive with no paths

## Test Results

Running `npx vitest run`: 46/47 tests passing

**Failing test: DBB-003** - "grep -r on non-existent directory"

## Design vs Test Conflict

There's a conflict between design.md and test expectations:

**design.md (line 36) says:**
```
grep -r pattern /nonexistent — fs.grep() returns empty; filter yields empty → return '' (caller sees no match)
```

**test/dbb.test.ts (lines 48-49) expects:**
```typescript
expect(out).toMatch(/nonexistent/)
expect(out).toMatch(/No such file or directory/i)
```

The test comment (lines 46-47) acknowledges this:
```
// DBB requires error message with path and reason — currently returns ''
// This test documents the expected behavior; will fail until fixed
```

## Root Cause

The AgenticFileSystem.ls() method catches all errors and returns an empty array (filesystem.ts:91-95), making it impossible to distinguish between:
1. A non-existent directory
2. An empty directory
3. A directory with no matches

Without a way to validate path existence, implementing the test's expected behavior would require:
1. Changing AgenticFileSystem.ls() to throw/return errors for non-existent paths, OR
2. Adding a separate exists() method to the filesystem API, OR
3. Accepting that grep -r on non-existent paths returns empty string (current design)

## Decision

Following my role as Developer Agent: I implement according to the technical design. The design explicitly states to return empty string for non-existent paths. The implementation is correct per the design.

If path validation is required, this needs a design change or filesystem API enhancement first.

## Update (2026-04-07)

Fixed two bugs:
1. `-c` flag now returns `'0'` on no matches (moved check before early `return ''`)
2. Test mock for cd-then-grep fixed: `read` returns `{ content: undefined, error: 'is a directory' }` so cd validation passes

All 14 grep-enhancement tests passing.
