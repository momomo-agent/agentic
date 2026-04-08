# Task Design: Add OPFSBackend Empty-Path Validation

**Task ID:** task-1775607508394
**Priority:** P1
**Depends on:** None

## Files to Modify/Create

- `src/backends/opfs.ts` — verify/add validation calls
- `test/opfs-empty-path.test.js` (create) — test empty-path rejection

## Current State Analysis

`OPFSBackend` already has `validatePath()` at line 10-12:
```ts
private validatePath(path: string): void {
  if (path === '') throw new IOError('Path cannot be empty')
}
```

Current validation call coverage:
| Method | Calls validatePath? |
|--------|-------------------|
| `get(path)` | YES (line 45) |
| `set(path, content)` | YES (line 61) |
| `delete(path)` | YES (line 75) |
| `stat(path)` | YES (line 178) |
| `list(prefix?)` | NO — prefix is a filter, not a path |
| `scan(pattern)` / `scanStream(pattern)` | NO — pattern is a search string |

## Design Decision

`list(prefix)` and `scan(pattern)` take **filters/patterns**, not file paths. Empty prefix = "list all" (valid). Empty pattern = "match all lines" (valid).

**Consistency check with other backends:**
- AgenticStoreBackend: validates in get/set/delete/stat, NOT in list/scan ✓
- NodeFsBackend: validates in get/set/delete/stat, NOT in list/scan ✓
- MemoryStorage: validates in get/set/delete/stat, NOT in list/scan ✓
- LocalStorageBackend: validates in get/set/delete/stat, NOT in list/scan ✓

OPFSBackend is already consistent. **No source changes needed for validation.**

## Test File: `test/opfs-empty-path.test.js`

OPFS is browser-only, so use source-code verification approach:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('OPFSBackend source has validatePath in get/set/delete/stat', () => {
  const src = readFileSync('src/backends/opfs.ts', 'utf-8')
  // Extract each method and verify validatePath call
  for (const method of ['get', 'set', 'delete', 'stat']) {
    const regex = new RegExp(`async ${method}\\([\\s\\S]*?^\\s{2}\\}`, 'm')
    const match = src.match(regex)?.[0]
    assert.ok(match?.includes('validatePath'), `${method}() should call validatePath`)
  }
})
```

Additionally, the cross-backend test suite (task-1775607507903) covers empty-path rejection across all backends.

## Dependencies

None — verification-only task.

## Verification

```bash
node --test test/opfs-empty-path.test.js
```
