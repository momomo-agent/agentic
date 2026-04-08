# Technical Design — Fix grep -i Multi-File/Recursive Inconsistency

## Problem
`grep -i` (case-insensitive) works correctly in single-file/streaming path but is broken in multi-file and recursive paths.

**Root cause**: `fs.grep(pattern)` performs case-sensitive matching at the filesystem level. The post-filter with case-insensitive regex (line 478-479) cannot recover results that `fs.grep()` already excluded.

**Example failure**: `grep -i hello /a.txt` where `/a.txt` contains "HELLO world"
- `fs.grep("hello")` returns `[]` (case-sensitive, no match for "HELLO")
- Post-filter has nothing to process
- Result: empty string (WRONG — should match "HELLO world")

## Fix

### File: `src/index.ts`

**Method**: `grep()` (lines 432-493)

**Change**: When `-i` flag is present AND (multiple file paths OR recursive mode), bypass `fs.grep()` entirely and use file-by-file reading with case-insensitive regex.

### Algorithm

```
if (caseInsensitive && (resolvedPaths.length > 0 || recursive)) {
  // Step 1: Build file list
  files = []
  if (resolvedPaths.length > 0) {
    for each path in resolvedPaths:
      if path is a directory (fs.ls succeeds):
        if recursive: collect all files recursively under path
        else: error "is a directory"
      else:
        add path to files
  } else if (recursive) {
    // No explicit path — search cwd recursively
    collect all files recursively under this.cwd
  }

  // Step 2: Read each file, match case-insensitively
  allResults = []
  regex = new RegExp(pattern, 'i')
  for each file in files:
    r = await fs.read(file)
    if r.error: skip
    lines = (r.content ?? '').split('\n')
    for (line, idx) in lines:
      if regex.test(line):
        allResults.push({ path: file, line: idx+1, content: line })

  // Step 3: Format output
  if flags.includes('-c'): return String(allResults.length)
  if flags.includes('-l'): return [...new Set(allResults.map(r => r.path))].join('\n')
  return allResults.map(r => `${r.path}:${r.line}: ${r.content}`).join('\n')
}
```

### Helper: `collectFilesRecursive(basePath): Promise<string[]>`
Reuse the existing `findRecursive` pattern — iterate directories via `fs.ls()`, collect file paths. Extract as a private method or inline.

### Integration Point
Insert the case-insensitive block at line 472 (after `const caseInsensitive = ...`) and before the existing `fs.grep()` call. The existing code path handles non-`-i` cases.

## Files to Modify
- `src/index.ts` — `grep()` method, around lines 472-493

## Edge Cases
- `-i` with `-l`: return unique file paths (deduplicate via Set)
- `-i` with `-c`: return total case-insensitive match count across all files
- `-i` with `-r` and no explicit path: search from cwd
- `-i` on non-existent file: return error message
- `-i` on directory without `-r`: return "is a directory" error
- Empty results: return empty string
- Invalid regex: catch and return `grep: <pattern>: Invalid regular expression`

## Test Cases (add to `src/index.test.ts`)
```typescript
describe('grep -i consistency fix', () => {
  it('grep -i multi-file matches case-insensitively')
  it('grep -il multi-file returns correct files')
  it('grep -ic multi-file returns correct count')
  it('grep -ir recursive matches case-insensitively')
  it('grep -ilr recursive returns correct files')
  it('grep -icr recursive returns correct count')
  it('grep -i with no match returns empty')
  it('grep -i on non-existent file returns error')
})
```

## Dependencies
- None — all changes within `src/index.ts`
- Uses existing `fs.read()`, `fs.ls()` methods
