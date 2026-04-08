# Design: Add complete test suite

## Files to Create
- `src/tests/contract.ts` — shared backend contract tests
- `src/tests/agentic-store.test.ts`
- `src/tests/node-fs.test.ts`
- `src/tests/opfs.test.ts`
- `vitest.config.ts` (if not present)

## Blocked By
task-1775531683476 (scan() fix must land first)

## Test Framework
Vitest — already compatible with the TypeScript/tsup setup.

## src/tests/contract.ts
Exports a function `runBackendContract(name: string, factory: () => StorageBackend)`:
```ts
export function runBackendContract(name: string, factory: () => StorageBackend) {
  describe(`${name} contract`, () => {
    let b: StorageBackend
    beforeEach(() => { b = factory() })

    it('set/get roundtrip', async () => { ... })
    it('get missing returns null', async () => { ... })
    it('delete removes file', async () => { ... })
    it('list returns paths with leading slash', async () => { ... })
    it('list with prefix filters', async () => { ... })
    it('scan returns {path, line, content}', async () => { ... })
    it('scan returns correct line numbers', async () => { ... })
  })
}
```

## src/tests/agentic-store.test.ts
```ts
import { AgenticStoreBackend } from '../backends/agentic-store.js'
import { runBackendContract } from './contract.js'

function makeInMemoryStore() { /* Map-based AgenticStore mock */ }
runBackendContract('AgenticStoreBackend', () => new AgenticStoreBackend(makeInMemoryStore()))
```

## src/tests/node-fs.test.ts
```ts
import { NodeFsBackend } from '../backends/node-fs.js'
import { mkdtempSync } from 'node:fs'
import { runBackendContract } from './contract.js'

runBackendContract('NodeFsBackend', () => new NodeFsBackend(mkdtempSync('/tmp/afs-test-')))
```

## src/tests/opfs.test.ts
Mock `navigator.storage.getDirectory()` with an in-memory OPFS shim, then run contract.

## package.json addition
```json
"scripts": { "test": "vitest run" }
```

## Edge Cases Covered in Contract
- Empty path `""` → `get("")` returns null, `set("")` throws or errors
- Path with spaces/special chars: write + read roundtrip succeeds
- Overwrite: second `set()` replaces first

## Test Cases (summary)
All DBB-010, DBB-011, DBB-012, DBB-013 criteria covered by contract suite.
