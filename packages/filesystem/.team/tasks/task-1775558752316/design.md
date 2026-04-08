# Task Design: Implement stat() on OPFSBackend and AgenticStoreBackend

## Objective
Add stat() method to OPFSBackend and AgenticStoreBackend to return file metadata (size, mtime), enabling metadata population in ls() and tree() operations.

## Current State
- StorageBackend interface defines optional `stat?(path): Promise<{size, mtime} | null>` at types.ts:77
- NodeFsBackend already implements stat() using fs.stat()
- AgenticFileSystem.ls() and tree() already call storage.stat?.() to populate metadata
- OPFSBackend and AgenticStoreBackend missing stat() implementations

## Files to Modify

### 1. src/backends/opfs.ts
Add stat() method after scan() method (after line 94):

```typescript
async stat(path: string): Promise<{ size: number; mtime: number } | null> {
  try {
    const fh = await this.getFileHandle(path)
    const file = await fh.getFile()
    return { size: file.size, mtime: file.lastModified }
  } catch {
    return null
  }
}
```

**Implementation details:**
- Use existing `getFileHandle(path)` to locate the file
- Call `fh.getFile()` which returns a File object
- File.size: number of bytes
- File.lastModified: Unix timestamp in milliseconds
- Return null if file not found (catch block)
- No error throwing - consistent with NodeFsBackend behavior

### 2. src/backends/agentic-store.ts
Add stat() method after scan() method (after line 65):

```typescript
async stat(path: string): Promise<{ size: number; mtime: number } | null> {
  try {
    const value = await this.store.get(this.normPath(path))
    if (value == null) return null
    const content = String(value)
    return {
      size: new Blob([content]).size,
      mtime: Date.now() // Best-effort: IndexedDB doesn't track mtime
    }
  } catch {
    return null
  }
}
```

**Implementation details:**
- Use existing `store.get()` to check if file exists
- Calculate size using Blob to get accurate byte count (handles UTF-8)
- mtime: IndexedDB doesn't track modification time, use Date.now() as best-effort
- Return null if file not found or error occurs
- No error throwing - consistent with other backends

## Function Signatures

```typescript
// OPFSBackend (add to class)
async stat(path: string): Promise<{ size: number; mtime: number } | null>

// AgenticStoreBackend (add to class)
async stat(path: string): Promise<{ size: number; mtime: number } | null>
```

## Algorithm

### OPFSBackend.stat()
1. Call `getFileHandle(path)` to get FileSystemFileHandle
2. Call `fh.getFile()` to get File object
3. Extract `file.size` and `file.lastModified`
4. Return `{ size, mtime: lastModified }`
5. If any error occurs (file not found, permission denied), return null

### AgenticStoreBackend.stat()
1. Call `store.get(normPath(path))` to retrieve value
2. If value is null/undefined, return null
3. Convert value to string
4. Calculate size using `new Blob([content]).size` for accurate byte count
5. Return `{ size, mtime: Date.now() }`
6. If any error occurs, return null

## Edge Cases

### OPFSBackend
- **Missing file**: getFileHandle() throws → catch → return null
- **Permission denied**: getFileHandle() throws → catch → return null
- **Directory path**: OPFS doesn't have directories as files → getFileHandle() throws → return null
- **Empty path**: getFileHandle() will fail → return null

### AgenticStoreBackend
- **Missing file**: store.get() returns null → return null
- **Non-string value**: Convert to string before calculating size
- **Empty file**: size = 0, valid result
- **mtime accuracy**: IndexedDB doesn't track mtime, Date.now() is best-effort approximation

## Error Handling

- All errors caught and return null
- No error logging needed (consistent with get() behavior)
- Caller (AgenticFileSystem.ls() and tree()) handles null gracefully
- stat() is optional interface method, absence is acceptable

## Dependencies

### OPFSBackend
- No new dependencies
- Uses existing OPFS APIs: FileSystemFileHandle, File
- Requires browser with OPFS support (Chrome 86+, Safari 15.2+)

### AgenticStoreBackend
- No new dependencies
- Uses existing agentic-store interface
- Blob API for accurate byte counting (available in all modern environments)

## Test Cases

Add to `test/backends/opfs.test.ts`:

```typescript
describe('OPFSBackend.stat()', () => {
  test('returns size and mtime for existing file', async () => {
    const backend = new OPFSBackend()
    await backend.set('/test.txt', 'hello world')

    const meta = await backend.stat('/test.txt')
    expect(meta).not.toBeNull()
    expect(meta!.size).toBe(11) // 'hello world' = 11 bytes
    expect(meta!.mtime).toBeGreaterThan(Date.now() - 1000)
    expect(meta!.mtime).toBeLessThanOrEqual(Date.now())
  })

  test('returns null for missing file', async () => {
    const backend = new OPFSBackend()
    const meta = await backend.stat('/nonexistent.txt')
    expect(meta).toBeNull()
  })

  test('mtime updates on file modification', async () => {
    const backend = new OPFSBackend()
    await backend.set('/test.txt', 'v1')
    const meta1 = await backend.stat('/test.txt')

    await new Promise(resolve => setTimeout(resolve, 10))
    await backend.set('/test.txt', 'v2')
    const meta2 = await backend.stat('/test.txt')

    expect(meta2!.mtime).toBeGreaterThan(meta1!.mtime)
  })
})
```

Add to `test/backends/agentic-store.test.ts`:

```typescript
describe('AgenticStoreBackend.stat()', () => {
  test('returns size for existing file', async () => {
    const store = createMockStore()
    const backend = new AgenticStoreBackend(store)
    await backend.set('/test.txt', 'hello')

    const meta = await backend.stat('/test.txt')
    expect(meta).not.toBeNull()
    expect(meta!.size).toBe(5)
    expect(meta!.mtime).toBeGreaterThan(0)
  })

  test('returns null for missing file', async () => {
    const store = createMockStore()
    const backend = new AgenticStoreBackend(store)
    const meta = await backend.stat('/nonexistent.txt')
    expect(meta).toBeNull()
  })

  test('handles UTF-8 characters correctly', async () => {
    const store = createMockStore()
    const backend = new AgenticStoreBackend(store)
    await backend.set('/test.txt', '你好世界') // 12 bytes in UTF-8

    const meta = await backend.stat('/test.txt')
    expect(meta!.size).toBe(12)
  })
})
```

Add to `test/filesystem-metadata.test.ts` (new file):

```typescript
import { describe, test, expect } from 'vitest'
import { AgenticFileSystem } from '../src/filesystem.js'
import { OPFSBackend } from '../src/backends/opfs.js'
import { AgenticStoreBackend } from '../src/backends/agentic-store.js'
import { NodeFsBackend } from '../src/backends/node-fs.js'

describe('File metadata across backends', () => {
  test('OPFSBackend populates size and mtime in ls()', async () => {
    const fs = new AgenticFileSystem({ storage: new OPFSBackend() })
    await fs.write('/test.txt', 'hello')

    const results = await fs.ls('/')
    const file = results.find(r => r.name === '/test.txt')

    expect(file).toBeDefined()
    expect(file!.type).toBe('file')
    expect(file!.size).toBe(5)
    expect(file!.mtime).toBeGreaterThan(0)
  })

  test('AgenticStoreBackend populates size in ls()', async () => {
    const store = createMockStore()
    const fs = new AgenticFileSystem({ storage: new AgenticStoreBackend(store) })
    await fs.write('/test.txt', 'hello')

    const results = await fs.ls('/')
    const file = results.find(r => r.name === '/test.txt')

    expect(file).toBeDefined()
    expect(file!.type).toBe('file')
    expect(file!.size).toBe(5)
    expect(file!.mtime).toBeGreaterThan(0)
  })

  test('All backends with stat() return consistent metadata structure', async () => {
    const backends = [
      new NodeFsBackend('/tmp/test-' + Date.now()),
      new OPFSBackend(),
      new AgenticStoreBackend(createMockStore())
    ]

    for (const backend of backends) {
      await backend.set('/test.txt', 'content')
      const meta = await backend.stat!('/test.txt')

      expect(meta).not.toBeNull()
      expect(typeof meta!.size).toBe('number')
      expect(typeof meta!.mtime).toBe('number')
      expect(meta!.size).toBeGreaterThan(0)
      expect(meta!.mtime).toBeGreaterThan(0)
    }
  })
})
```

## Verification

```bash
# Run backend-specific tests
npm test -- test/backends/opfs.test.ts
npm test -- test/backends/agentic-store.test.ts

# Run cross-backend metadata tests
npm test -- test/filesystem-metadata.test.ts

# Verify ls() returns metadata
node -e "
import { AgenticFileSystem } from './src/index.js';
import { OPFSBackend } from './src/backends/opfs.js';
const fs = new AgenticFileSystem({ storage: new OPFSBackend() });
await fs.write('/test.txt', 'hello world');
const results = await fs.ls('/');
console.log(results);
"
```

## Performance Impact

### OPFSBackend
- Adds one `getFile()` call per file when ls() is called
- getFile() is fast (~0.1ms per file)
- Acceptable overhead for metadata retrieval
- Only called when stat() is available (optional interface method)

### AgenticStoreBackend
- Adds one `store.get()` call per file when ls() is called
- IndexedDB get is fast (~0.5ms per file)
- Blob size calculation is negligible (<0.01ms)
- mtime is not accurate (uses Date.now()), but acceptable for best-effort
- Only called when stat() is available (optional interface method)

## Notes

- AgenticStoreBackend mtime is not accurate since IndexedDB doesn't track modification time
- This is acceptable as stat() is optional and best-effort
- Callers should not rely on mtime accuracy for AgenticStoreBackend
- Consider documenting this limitation in README or JSDoc
