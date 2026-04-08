# Design: stat() on AgenticStoreBackend and OPFSBackend

## Status
Both backends already implement `stat()` matching the `StorageBackend` interface contract.
This task requires adding test coverage only — no source changes needed.

## Files to Create
- `test/backends/agentic-store-stat.test.ts`
- `test/backends/opfs-stat.test.ts` (browser-only, skip in Node)

## Test Cases

### agentic-store-stat.test.ts
```ts
import { AgenticStoreBackend } from '../../src/backends/agentic-store.js'

// setup: in-memory store mock
describe('AgenticStoreBackend.stat()', () => {
  it('returns size/mtime/isDirectory for existing file')
  it('returns null for missing file')
  it('isDirectory is always false')
  it('size matches byte length of content')
})
```

### opfs-stat.test.ts
```ts
// Skip entirely in Node: if (typeof navigator === 'undefined') skip()
describe('OPFSBackend.stat()', () => {
  it('returns size from File.size and mtime from File.lastModified')
  it('returns null for missing file')
  it('isDirectory is always false')
})
```

## Edge Cases
- Empty string content: size = 0, not null
- Unicode content: size = byte length (Blob), not char length

## Dependencies
- No source changes
- Needs a minimal in-memory AgenticStore mock for unit tests
