# Task Design: Verify per-backend test coverage completeness

## Summary

Audit each of the 6 backends for test coverage on core methods (get, set, delete, list, scan, stat) and create any missing per-backend test files. PRD §4 requires complete per-backend test suites.

## Files to Audit/Create

- `test/cross-backend.test.js` — verify all 5 Node.js-testable backends are in the test loop
- `test/backends/` — create missing per-backend test files if needed

## Current Coverage Audit

### Cross-Backend Tests
`test/cross-backend.test.js` covers 5 backends: `NodeFsBackend`, `AgenticStoreBackend`, `MemoryStorage`, `LocalStorageBackend`, `SQLiteBackend`
- Tested methods: get, set, delete, list, scan, batchGet, batchSet, stat
- OPFSBackend excluded (browser-only, correct)

### Per-Backend Test Files
| Backend | Dedicated test file(s) | Status |
|---------|----------------------|--------|
| MemoryStorage | `test/memory-storage.test.js`, `test/backends/memory.test.js` | Covered |
| LocalStorageBackend | `test/local-storage-backend.test.js`, `test/backends/local-storage.test.js` | Covered |
| SQLiteBackend | `test/sqlite-backend.test.js`, `test/create-backend-sqlite.test.js` | Covered |
| AgenticStoreBackend | `test/backends/agentic-store-*.test.js` | Covered |
| NodeFsBackend | None dedicated — only in cross-backend loop | **Gap** |
| OPFSBackend | `test/backends/opfs.test.js` (browser) | Covered |

## Implementation

### Step 1: Audit cross-backend test matrix

Read `test/cross-backend.test.js` and verify:
- The `backends` array includes all 5 Node.js-testable backends
- Each method (get, set, delete, list, scan, batchGet, batchSet, stat) has assertions
- Document the test matrix as a comment at the top of the file

### Step 2: Create `test/backends/node-fs.test.js` (if missing)

If NodeFsBackend lacks dedicated tests beyond the cross-backend loop:

```js
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NodeFsBackend } from '../../src/backends/node-fs.js'

describe('NodeFsBackend', () => {
  let dir, backend

  test('setup', async () => {
    dir = await mkdtemp(join(tmpdir(), 'afs-test-'))
    backend = new NodeFsBackend(dir)
  })

  test('get/set/delete', async () => {
    await backend.set('/test.txt', 'hello')
    assert.equal(await backend.get('/test.txt'), 'hello')
    await backend.delete('/test.txt')
    assert.equal(await backend.get('/test.txt'), null)
  })

  test('list', async () => {
    await backend.set('/a.txt', 'a')
    await backend.set('/b.txt', 'b')
    const files = await backend.list()
    assert.ok(files.includes('/a.txt'))
    assert.ok(files.includes('/b.txt'))
  })

  test('scan', async () => {
    await backend.set('/scan-test.txt', 'hello world\nfoo bar')
    const results = await backend.scan('hello')
    assert.equal(results.length, 1)
    assert.equal(results[0].content, 'hello world')
  })

  test('stat', async () => {
    await backend.set('/stat-test.txt', 'content')
    const s = await backend.stat('/stat-test.txt')
    assert.ok(s)
    assert.equal(s.size, 'content'.length)
    assert.equal(s.isDirectory, false)
    const missing = await backend.stat('/nonexistent.txt')
    assert.equal(missing, null)
  })

  test('cleanup', async () => {
    await rm(dir, { recursive: true, force: true })
  })
})
```

### Step 3: Verify all tests pass

```bash
node --test test/cross-backend.test.js
node --test test/backends/node-fs.test.js
```

## Edge Cases
- OPFSBackend correctly excluded from Node.js test suite
- `stat()` may return null for missing files — assert null, not throw
- `list()` paths must start with `/`

## Dependencies
- None — test-only changes
