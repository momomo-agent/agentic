# Task Design: Implement file metadata in LsResult

## Objective
Add stat() method to OPFSBackend to populate size and mtime fields in LsResult, matching NodeFsBackend behavior.

## Current State
- NodeFsBackend already implements stat() at line 87-94
- AgenticFileSystem.ls() already calls storage.stat?.() at line 122
- StorageBackend interface defines optional stat() at types.ts:77
- OPFSBackend missing stat() implementation

## Files to Modify

### src/backends/opfs.ts
Add stat() method after the scan() method (after line 94):

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

## Function Signatures

```typescript
// OPFSBackend (add to class)
async stat(path: string): Promise<{ size: number; mtime: number } | null>
```

## Algorithm

1. Call `getFileHandle(path)` to get FileSystemFileHandle
2. Call `fh.getFile()` to get File object
3. Extract `file.size` and `file.lastModified`
4. Return `{ size, mtime: lastModified }`
5. If any error occurs (file not found, permission denied), return null

## Edge Cases

- **Missing file**: getFileHandle() throws → catch → return null
- **Permission denied**: getFileHandle() throws → catch → return null
- **Directory path**: OPFS doesn't have directories as files → getFileHandle() throws → return null
- **Empty path**: getFileHandle() will fail → return null

## Error Handling

- All errors caught and return null
- No error logging needed (consistent with get() behavior)
- Caller (AgenticFileSystem.ls()) handles null gracefully

## Dependencies

- No new dependencies
- Uses existing OPFS APIs: FileSystemFileHandle, File
- Requires browser with OPFS support (Chrome 86+, Safari 15.2+)

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

Add to `test/filesystem-metadata.test.ts` (new file):

```typescript
import { describe, test, expect } from 'vitest'
import { AgenticFileSystem } from '../src/filesystem.js'
import { OPFSBackend } from '../src/backends/opfs.js'
import { NodeFsBackend } from '../src/backends/node-fs.js'

describe('File metadata in ls()', () => {
  test('OPFSBackend populates size and mtime', async () => {
    const fs = new AgenticFileSystem({ storage: new OPFSBackend() })
    await fs.write('/test.txt', 'hello')

    const results = await fs.ls('/')
    const file = results.find(r => r.name === '/test.txt')

    expect(file).toBeDefined()
    expect(file!.type).toBe('file')
    expect(file!.size).toBe(5)
    expect(file!.mtime).toBeGreaterThan(0)
  })

  test('NodeFsBackend populates size and mtime', async () => {
    const tmpDir = '/tmp/test-' + Date.now()
    const fs = new AgenticFileSystem({ storage: new NodeFsBackend(tmpDir) })
    await fs.write('/test.txt', 'hello')

    const results = await fs.ls('/')
    const file = results.find(r => r.name === '/test.txt')

    expect(file).toBeDefined()
    expect(file!.type).toBe('file')
    expect(file!.size).toBe(5)
    expect(file!.mtime).toBeGreaterThan(0)
  })
})
```

## Verification

```bash
# Run OPFS backend tests
npm test -- test/backends/opfs.test.ts

# Run metadata tests
npm test -- test/filesystem-metadata.test.ts

# Verify ls() returns metadata
node -e "
import { AgenticFileSystem } from './src/index.js';
import { OPFSBackend } from './src/backends/opfs.js';
const fs = new AgenticFileSystem({ storage: new OPFSBackend() });
await fs.write('/test.txt', 'hello');
const results = await fs.ls('/');
console.log(results);
"
```

## Performance Impact

- Adds one `getFile()` call per file when ls() is called
- getFile() is fast (~0.1ms per file)
- Acceptable overhead for metadata retrieval
- Only called when stat() is available (optional interface method)
