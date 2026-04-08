# Technical Design — OPFSBackend walkDir() Graceful Error Handling

## Summary

`OPFSBackend.walkDir()` already has try-catch with `console.error` around individual entries (lines 83-89 of `src/backends/opfs.ts`). The `walkDir` recursive call is inside the try block, so `getDirectoryHandle()` throws (e.g., permission denied, corrupted directory) are caught and skipped per-entry. **No code changes are needed in walkDir itself.**

The task's real deliverable is a **test proving graceful behavior** — verifying that walkDir continues past errors instead of throwing.

## Files to Modify

- **`test/cross-backend.test.js`** — add OPFS-specific walkDir error resilience test (or a dedicated `test/opfs-walkdir.test.js` if OPFS tests cannot run in Node.js)

## Approach

Since OPFS is browser-only (requires `navigator.storage`), a full functional test cannot run in Node.js. Two options:

### Option A: Unit test with mock (recommended)

Create `test/opfs-walkdir.test.js`:

```js
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { OPFSBackend } from '../src/backends/opfs.js'

// Mock OPFS global environment
function setupOPFSMock(entries) {
  const mockDir = {
    async *[Symbol.asyncIterator]() {
      for (const entry of entries) yield entry
    },
    getDirectoryHandle: async (name) => {
      const sub = entries.find(e => e[0] === name && e[1].kind === 'directory')
      if (!sub) throw Object.assign(new Error('NotFound'), { name: 'NotFoundError' })
      return sub[1]
    }
  }
  globalThis.navigator = {
    storage: { getDirectory: async () => mockDir }
  }
}

// Test: walkDir skips entries that throw during iteration
// Test: walkDir logs errors via console.error (capture stderr)
// Test: walkDir still collects valid file paths
```

### Option B: Inline assertion in cross-backend test

Add a test block guarded by `if (globalThis.navigator?.storage)` that exercises the real OPFS backend. Less reliable in CI.

## Function Signature

No changes to existing signatures. The `walkDir` method is private:

```ts
private async walkDir(dir: FileSystemDirectoryHandle, base: string, out: string[]): Promise<void>
```

## Test Cases

1. **walkDir skips unreadable entries**: Provide a mock directory with 3 entries — one file (valid), one directory that throws on iteration, one file (valid). Assert both valid files appear in output.
2. **walkDir logs errors**: Capture `console.error` output and assert the skipping message includes the entry name.
3. **walkDir with empty directory**: Returns empty array with no errors.
4. **list() indirectly exercises walkDir**: Verify `list()` returns all readable files even when some entries cause errors.

## Edge Cases

- Entry iterator throws mid-way (not at start) — catch must handle this
- Recursive subdirectory that also has errors — nested walkDir call must also skip gracefully
- `DOMException` with `NotFoundError` from `getDirectoryHandle` — currently untested

## Dependencies

- `src/backends/opfs.ts` — no changes needed
- `src/errors.ts` — IOError class (imported by OPFSBackend)
- Node.js `node:test` runner for test execution
