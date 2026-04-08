# Task Design: Expose batchGet/batchSet/scanStream as AgenticFileSystem public methods

## Summary

Verify that `batchGet`, `batchSet`, and `scanStream` are properly exposed as public methods on `AgenticFileSystem` and as agent tool definitions. Based on code review, all three are already implemented — this task is verification + test hardening.

## Files to Modify

- `test/agent-tools-dbb.test.js` — add assertions for `batch_get`, `batch_set`, `grep_stream` tools

## Current State (verified)

### Public Methods on AgenticFileSystem (src/filesystem.ts)
- `batchGet(paths)` at line 210 — **exists**, delegates to `this.storage.batchGet(paths)`
- `batchSet(entries)` at line 218 — **exists**, delegates to `this.storage.batchSet(entries)`, throws if readOnly
- `scanStream(pattern)` at line 228 — **exists**, delegates to `this.storage.scanStream(pattern)`

### Agent Tool Definitions (src/filesystem.ts:294-406)
- `batch_get` at line 363 — **exists**
- `batch_set` at line 379 — **exists**
- `grep_stream` at line 393 — **exists**

### executeTool() Handlers (src/filesystem.ts:410-438)
- `case 'batch_get'` at line 425 — **exists**
- `case 'batch_set'` at line 427 — **exists**
- `case 'grep_stream'` at line 428 — **exists**

## Implementation

### Test: Verify tool definitions are present

In `test/agent-tools-dbb.test.js` (or create if missing), add:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AgenticFileSystem, MemoryStorage } from '../src/index.js'

test('getToolDefinitions includes batch_get, batch_set, grep_stream', async () => {
  const fs = new AgenticFileSystem({ storage: new MemoryStorage() })
  const tools = fs.getToolDefinitions()
  const names = tools.map(t => t.name)
  assert.ok(names.includes('batch_get'), 'batch_get tool missing')
  assert.ok(names.includes('batch_set'), 'batch_set tool missing')
  assert.ok(names.includes('grep_stream'), 'grep_stream tool missing')
})

test('executeTool handles batch_get', async () => {
  const fs = new AgenticFileSystem({ storage: new MemoryStorage() })
  await fs.write('/a.txt', 'hello')
  const result = await fs.executeTool('batch_get', { paths: ['/a.txt'] })
  assert.deepStrictEqual(result, { '/a.txt': 'hello' })
})

test('executeTool handles batch_set', async () => {
  const fs = new AgenticFileSystem({ storage: new MemoryStorage() })
  await fs.executeTool('batch_set', { entries: { '/a.txt': 'hello', '/b.txt': 'world' } })
  const a = await fs.read('/a.txt')
  assert.equal(a.content, 'hello')
})

test('executeTool handles grep_stream', async () => {
  const fs = new AgenticFileSystem({ storage: new MemoryStorage() })
  await fs.write('/a.txt', 'hello world\nfoo bar')
  const result = await fs.executeTool('grep_stream', { pattern: 'hello' })
  assert.ok(Array.isArray(result))
  assert.equal(result.length, 1)
  assert.equal(result[0].content, 'hello world')
})
```

### Edge Cases
- `batchSet` on read-only filesystem should throw `PermissionDeniedError`
- `grep_stream` with no matches returns empty array
- `batchGet` with missing paths returns `null` for those paths

### Test Verification
```bash
node --test test/agent-tools-dbb.test.js
```

## Dependencies
- None — test-only change, all source code already implements these features
