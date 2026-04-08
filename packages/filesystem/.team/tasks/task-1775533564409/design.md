# Design: Cross-backend consistency tests

## File to Create

- `tests/cross-backend.test.js`

## Test Setup

Use Node.js built-in `node:test` + `node:assert`. Import `NodeFsBackend` and `AgenticStoreBackend` (OPFS is browser-only, skip). For `MemoryStorage` backend once implemented, add it here too.

Create a minimal in-memory mock for `AgenticStore`:

```js
function makeMemStore() {
  const m = new Map()
  return {
    get: async k => m.get(k) ?? undefined,
    set: async (k, v) => m.set(k, v),
    delete: async k => m.delete(k),
    keys: async () => [...m.keys()],
    has: async k => m.has(k),
  }
}
```

## Test Suite Structure

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NodeFsBackend } from '../src/backends/node-fs.js'
import { AgenticStoreBackend } from '../src/backends/agentic-store.js'

function backends() {
  const dir = mkdtempSync(join(tmpdir(), 'afs-'))
  return {
    NodeFsBackend: new NodeFsBackend(dir),
    AgenticStoreBackend: new AgenticStoreBackend(makeMemStore()),
    _cleanup: () => rmSync(dir, { recursive: true }),
  }
}
```

## Test Cases (run for each backend)

For each backend in `backends()`:

1. **get/set**: `set('/a', 'hello')` → `get('/a')` === `'hello'`
2. **get missing**: `get('/missing')` === `null`
3. **delete**: `set('/b', 'x')`, `delete('/b')`, `get('/b')` === `null`
4. **delete missing**: `delete('/nope')` resolves without error
5. **list**: `set('/c', '1')`, `set('/d', '2')`, `list()` includes `'/c'` and `'/d'`
6. **list prefix**: `set('/foo/a', '1')`, `set('/bar/b', '2')`, `list('/foo')` === `['/foo/a']`
7. **scan**: `set('/f', 'hello world')`, `scan('world')` returns `[{ path: '/f', line: 1, content: 'hello world' }]`
8. **scan no match**: `scan('zzznomatch')` === `[]`

## Dependencies

- `NodeFsBackend`, `AgenticStoreBackend` from `src/backends/`
- Node.js `node:test`, `node:assert`, `node:fs`, `node:os`
