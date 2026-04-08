# Task Design: Add Cross-Backend Consistency Test Suite

**Task ID:** task-1775607507903
**Priority:** P1
**Depends on:** task-1775607508394 (OPFS empty-path), task-1775607509173 (error normalization), task-1775607509331 (OPFS stat dir), task-1775607509442 (OPFS delete)

## Files to Create

- `test/cross-backend-consistency.test.js`

## Approach

Create a single test file that runs an identical behavioral test matrix against all 5 Node.js-testable backends. Reuse the `makeBackends()` factory pattern from `test/cross-backend.test.js` (lines 69-79).

OPFSBackend is excluded (browser-only) — document with comment at top of file.

## Factory Setup

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NodeFsBackend, AgenticStoreBackend, MemoryStorage, LocalStorageBackend, SQLiteBackend } from '../dist/index.js'

function makeMemStore() { /* Map-based store adapter */ }
function makeMockLocalStorage() { /* mock Storage interface */ }
class MockSQLiteDb { /* mock better-sqlite3 interface */ }
function makeBackends() { /* returns 5 backends with cleanup */ }
```

## Test Matrix (15 tests x 5 backends = 75 tests)

| # | Test | Assertion |
|---|------|-----------|
| 1 | get/set round-trip | `get('/a')` after `set('/a', 'v')` returns `'v'` |
| 2 | get missing | `get('/missing')` returns `null` |
| 3 | delete missing | `delete('/missing')` resolves without error |
| 4 | empty path set | `set('', 'v')` throws `IOError` |
| 5 | empty path get | `get('')` throws `IOError` |
| 6 | empty path delete | `delete('')` throws `IOError` |
| 7 | empty path stat | `stat('')` throws `IOError` (where stat exists) |
| 8 | list returns /-prefixed | all results start with `/` |
| 9 | list with prefix filter | filters correctly |
| 10 | stat fields | returns `{ size, mtime, isDirectory, permissions }` |
| 11 | stat missing | throws `NotFoundError` |
| 12 | batchGet round-trip | returns correct values and null for missing |
| 13 | batchSet round-trip | values readable after batchSet |
| 14 | scan match | returns `{ path, line, content }` with correct values |
| 15 | scan no match | returns `[]` |

## Dependencies

- Must run AFTER tasks 2-5 (source fixes) so assertions on error types and stat behavior pass
- Imports all 5 backends from `dist/index.js`

## Verification

```bash
node --test test/cross-backend-consistency.test.js
```
