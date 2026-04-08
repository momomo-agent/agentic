# Task Design: Fix OPFSBackend delete() Error Handling

**Task ID:** task-1775607509442
**Priority:** P1
**Depends on:** None

## Files to Modify/Create

- `src/backends/opfs.ts` — verify/fix `delete()` method
- `test/opfs-delete.test.js` (create) — test delete error handling

## Current Code (lines 74-87)

```ts
async delete(path: string): Promise<void> {
  this.validatePath(path)
  const parts = path.replace(/^\//, '').split('/')
  let dir = await this.getRoot()
  try {
    for (const part of parts.slice(0, -1)) {
      dir = await dir.getDirectoryHandle(part)
    }
    await dir.removeEntry(parts[parts.length - 1])
  } catch (e) {
    if (e instanceof DOMException && e.name === 'NotFoundError') return
    throw new IOError(String(e))
  }
}
```

## Analysis

The code **already correctly handles** NotFoundError:
- `dir.getDirectoryHandle(part)` throws `NotFoundError` if parent dir missing → caught at line 84 → returns silently
- `dir.removeEntry(name)` throws `NotFoundError` if file missing → caught at line 84 → returns silently

This matches `NodeFsBackend.delete()` (catches ENOENT) and `AgenticStoreBackend.delete()` (no-op on missing key).

**No functional source changes needed.**

## Source Change: Add clarifying comment

```ts
} catch (e) {
  // NotFoundError from removeEntry() or getDirectoryHandle() treated as no-op
  // (consistent with NodeFsBackend and AgenticStoreBackend behavior)
  if (e instanceof DOMException && e.name === 'NotFoundError') return
  throw new IOError(String(e))
}
```

## Test File: `test/opfs-delete.test.js`

Since OPFS is browser-only, use source-code verification:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('OPFSBackend delete() catches NotFoundError DOMException', () => {
  const src = readFileSync('src/backends/opfs.ts', 'utf-8')
  const deleteSection = src.match(/async delete\(path: string\)[\s\S]*?^\s{2}\}/m)?.[0]
  assert.ok(
    deleteSection?.includes("e.name === 'NotFoundError'"),
    'delete() should catch DOMException NotFoundError'
  )
})

test('OPFSBackend delete() returns silently on NotFoundError', () => {
  const src = readFileSync('src/backends/opfs.ts', 'utf-8')
  const deleteSection = src.match(/async delete\(path: string\)[\s\S]*?^\s{2}\}/m)?.[0]
  // After catching NotFoundError, should return (not throw)
  const catchBlock = deleteSection?.match(/catch[\s\S]*?^\s{2}\}/m)?.[0]
  assert.ok(
    catchBlock?.includes('return') && !catchBlock?.includes('throw new NotFoundError'),
    'delete() should return silently, not throw NotFoundError'
  )
})

test('OPFSBackend delete() wraps non-NotFoundError in IOError', () => {
  const src = readFileSync('src/backends/opfs.ts', 'utf-8')
  const deleteSection = src.match(/async delete\(path: string\)[\s\S]*?^\s{2}\}/m)?.[0]
  assert.ok(
    deleteSection?.includes('IOError'),
    'delete() should wrap unexpected errors in IOError'
  )
})
```

## Edge Cases

1. **Missing file**: `delete('/nope')` → `removeEntry('nope')` throws NotFoundError → caught → returns. ✓
2. **Missing parent**: `delete('/nope/file.txt')` → `getDirectoryHandle('nope')` throws NotFoundError → caught → returns. ✓
3. **Empty path**: `delete('')` → validatePath throws IOError (line 75). ✓

## Dependencies

None.

## Verification

```bash
node --test test/opfs-delete.test.js
node --test test/cross-backend.test.js  # regression
```
