# Task Design: Add concurrent and edge-case tests

## Objective
Write comprehensive tests for concurrent writes, race conditions, empty paths, and special characters across all backends to ensure robustness and consistency.

## Files to Create

### test/concurrent.test.ts
Tests for parallel operations and race conditions.

### test/edge-cases.test.ts
Tests for boundary conditions, special characters, and error cases.

## Test Strategy

Use parameterized tests to run identical test suites against all backends:
- NodeFsBackend
- OPFSBackend
- AgenticStoreBackend
- MemoryBackend
- LocalStorageBackend

## File 1: test/concurrent.test.ts

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { NodeFsBackend } from '../src/backends/node-fs.js'
import { OPFSBackend } from '../src/backends/opfs.js'
import { AgenticStoreBackend } from '../src/backends/agentic-store.js'
import { MemoryBackend } from '../src/backends/memory.js'
import { LocalStorageBackend } from '../src/backends/local-storage.js'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Mock AgenticStore for testing
class MockAgenticStore {
  private data = new Map<string, string>()
  async get(key: string) { return this.data.get(key) ?? null }
  async set(key: string, value: string) { this.data.set(key, value) }
  async delete(key: string) { this.data.delete(key) }
  async keys() { return Array.from(this.data.keys()) }
  async has(key: string) { return this.data.has(key) }
}

describe.each([
  ['NodeFsBackend', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'test-'))
    return { backend: new NodeFsBackend(tmpDir), cleanup: () => rm(tmpDir, { recursive: true, force: true }) }
  }],
  ['MemoryBackend', async () => {
    return { backend: new MemoryBackend(), cleanup: () => {} }
  }],
  ['AgenticStoreBackend', async () => {
    return { backend: new AgenticStoreBackend(new MockAgenticStore()), cleanup: () => {} }
  }],
  // Note: OPFS and LocalStorage require browser environment, skip in Node tests
])('%s concurrent operations', (name, createBackend) => {
  let backend: any
  let cleanup: () => void

  beforeEach(async () => {
    const result = await createBackend()
    backend = result.backend
    cleanup = result.cleanup
  })

  afterEach(async () => {
    await cleanup()
  })

  test('concurrent writes to different files succeed', async () => {
    const writes = Array.from({ length: 20 }, (_, i) =>
      backend.set(`/file${i}.txt`, `content ${i}`)
    )
    await Promise.all(writes)

    // Verify all files written correctly
    for (let i = 0; i < 20; i++) {
      const content = await backend.get(`/file${i}.txt`)
      expect(content).toBe(`content ${i}`)
    }
  })

  test('concurrent writes to same file complete without error', async () => {
    const writes = Array.from({ length: 10 }, (_, i) =>
      backend.set('/shared.txt', `version ${i}`)
    )
    await Promise.all(writes)

    // Final content should be one of the versions (no corruption)
    const content = await backend.get('/shared.txt')
    expect(content).toMatch(/^version \d+$/)
  })

  test('concurrent reads while writing', async () => {
    await backend.set('/test.txt', 'initial')

    const operations = [
      backend.set('/test.txt', 'updated'),
      backend.get('/test.txt'),
      backend.get('/test.txt'),
      backend.get('/test.txt')
    ]

    const results = await Promise.all(operations)

    // First result is set (void), rest are reads
    expect(results[1]).toMatch(/^(initial|updated)$/)
    expect(results[2]).toMatch(/^(initial|updated)$/)
    expect(results[3]).toMatch(/^(initial|updated)$/)
  })

  test('concurrent deletes of same file', async () => {
    await backend.set('/test.txt', 'content')

    const deletes = Array.from({ length: 5 }, () => backend.delete('/test.txt'))
    await Promise.all(deletes)

    // File should be deleted, no errors thrown
    const content = await backend.get('/test.txt')
    expect(content).toBeNull()
  })

  test('concurrent list operations', async () => {
    await backend.set('/file1.txt', 'a')
    await backend.set('/file2.txt', 'b')
    await backend.set('/file3.txt', 'c')

    const lists = Array.from({ length: 10 }, () => backend.list())
    const results = await Promise.all(lists)

    // All list results should be identical
    results.forEach(list => {
      expect(list).toContain('/file1.txt')
      expect(list).toContain('/file2.txt')
      expect(list).toContain('/file3.txt')
    })
  })

  test('concurrent batchSet operations', async () => {
    const batch1 = { '/a1.txt': 'a1', '/a2.txt': 'a2' }
    const batch2 = { '/b1.txt': 'b1', '/b2.txt': 'b2' }
    const batch3 = { '/c1.txt': 'c1', '/c2.txt': 'c2' }

    await Promise.all([
      backend.batchSet(batch1),
      backend.batchSet(batch2),
      backend.batchSet(batch3)
    ])

    // Verify all files written
    expect(await backend.get('/a1.txt')).toBe('a1')
    expect(await backend.get('/b1.txt')).toBe('b1')
    expect(await backend.get('/c1.txt')).toBe('c1')
  })

  test('concurrent scan operations', async () => {
    await backend.set('/file1.txt', 'hello world')
    await backend.set('/file2.txt', 'hello universe')
    await backend.set('/file3.txt', 'goodbye')

    const scans = Array.from({ length: 5 }, () => backend.scan('hello'))
    const results = await Promise.all(scans)

    // All scan results should be identical
    results.forEach(result => {
      expect(result).toHaveLength(2)
      expect(result.some((r: any) => r.path === '/file1.txt')).toBe(true)
      expect(result.some((r: any) => r.path === '/file2.txt')).toBe(true)
    })
  })

  test('write-delete-write race condition', async () => {
    const operations = [
      backend.set('/test.txt', 'v1'),
      backend.delete('/test.txt'),
      backend.set('/test.txt', 'v2')
    ]

    await Promise.all(operations)

    // Final state should be either deleted or v2 (not v1)
    const content = await backend.get('/test.txt')
    if (content !== null) {
      expect(content).toBe('v2')
    }
  })
})
```

## File 2: test/edge-cases.test.ts

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { NodeFsBackend } from '../src/backends/node-fs.js'
import { MemoryBackend } from '../src/backends/memory.js'
import { AgenticStoreBackend } from '../src/backends/agentic-store.js'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

class MockAgenticStore {
  private data = new Map<string, string>()
  async get(key: string) { return this.data.get(key) ?? null }
  async set(key: string, value: string) { this.data.set(key, value) }
  async delete(key: string) { this.data.delete(key) }
  async keys() { return Array.from(this.data.keys()) }
  async has(key: string) { return this.data.has(key) }
}

describe.each([
  ['NodeFsBackend', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'test-'))
    return { backend: new NodeFsBackend(tmpDir), cleanup: () => rm(tmpDir, { recursive: true, force: true }) }
  }],
  ['MemoryBackend', async () => {
    return { backend: new MemoryBackend(), cleanup: () => {} }
  }],
  ['AgenticStoreBackend', async () => {
    return { backend: new AgenticStoreBackend(new MockAgenticStore()), cleanup: () => {} }
  }]
])('%s edge cases', (name, createBackend) => {
  let backend: any
  let cleanup: () => void

  beforeEach(async () => {
    const result = await createBackend()
    backend = result.backend
    cleanup = result.cleanup
  })

  afterEach(async () => {
    await cleanup()
  })

  describe('empty and invalid paths', () => {
    test('empty string path returns null on get', async () => {
      const content = await backend.get('')
      expect(content).toBeNull()
    })

    test('empty string path on set creates no file', async () => {
      await backend.set('', 'content')
      const paths = await backend.list()
      expect(paths).not.toContain('')
    })

    test('root path "/" handled correctly', async () => {
      // Root is a directory, not a file
      const content = await backend.get('/')
      expect(content).toBeNull()
    })
  })

  describe('special characters in paths', () => {
    test('spaces in filename', async () => {
      await backend.set('/file with spaces.txt', 'content')
      const content = await backend.get('/file with spaces.txt')
      expect(content).toBe('content')

      const paths = await backend.list()
      expect(paths).toContain('/file with spaces.txt')
    })

    test('unicode characters', async () => {
      await backend.set('/文件.txt', 'content')
      await backend.set('/файл.txt', 'content')
      await backend.set('/αρχείο.txt', 'content')

      expect(await backend.get('/文件.txt')).toBe('content')
      expect(await backend.get('/файл.txt')).toBe('content')
      expect(await backend.get('/αρχείο.txt')).toBe('content')
    })

    test('dots in filename', async () => {
      await backend.set('/file.name.with.dots.txt', 'content')
      const content = await backend.get('/file.name.with.dots.txt')
      expect(content).toBe('content')
    })

    test('dashes and underscores', async () => {
      await backend.set('/file-with-dashes.txt', 'content1')
      await backend.set('/file_with_underscores.txt', 'content2')

      expect(await backend.get('/file-with-dashes.txt')).toBe('content1')
      expect(await backend.get('/file_with_underscores.txt')).toBe('content2')
    })

    test('parentheses and brackets', async () => {
      await backend.set('/file(1).txt', 'content1')
      await backend.set('/file[2].txt', 'content2')

      expect(await backend.get('/file(1).txt')).toBe('content1')
      expect(await backend.get('/file[2].txt')).toBe('content2')
    })
  })

  describe('path normalization', () => {
    test('all list results start with /', async () => {
      await backend.set('/file1.txt', 'a')
      await backend.set('/dir/file2.txt', 'b')

      const paths = await backend.list()
      expect(paths.every((p: string) => p.startsWith('/'))).toBe(true)
    })

    test('no backslashes in paths', async () => {
      await backend.set('/dir/file.txt', 'content')

      const paths = await backend.list()
      expect(paths.every((p: string) => !p.includes('\\'))).toBe(true)
    })

    test('double slashes normalized', async () => {
      await backend.set('//file.txt', 'content')
      const content = await backend.get('/file.txt')

      // Should be accessible via single slash
      expect(content).toBeTruthy()
    })
  })

  describe('large content', () => {
    test('1MB file', async () => {
      const largeContent = 'x'.repeat(1024 * 1024)
      await backend.set('/large.txt', largeContent)

      const content = await backend.get('/large.txt')
      expect(content).toBe(largeContent)
      expect(content!.length).toBe(1024 * 1024)
    })

    test('empty file', async () => {
      await backend.set('/empty.txt', '')
      const content = await backend.get('/empty.txt')
      expect(content).toBe('')
    })

    test('file with many lines', async () => {
      const lines = Array.from({ length: 10000 }, (_, i) => `line ${i}`)
      const content = lines.join('\n')
      await backend.set('/many-lines.txt', content)

      const retrieved = await backend.get('/many-lines.txt')
      expect(retrieved?.split('\n').length).toBe(10000)
    })
  })

  describe('scan edge cases', () => {
    test('scan with no matches', async () => {
      await backend.set('/file1.txt', 'hello')
      await backend.set('/file2.txt', 'world')

      const results = await backend.scan('nonexistent')
      expect(results).toHaveLength(0)
    })

    test('scan with special regex characters', async () => {
      await backend.set('/test.txt', 'price: $100')

      const results = await backend.scan('$100')
      expect(results).toHaveLength(1)
      expect(results[0].content).toContain('$100')
    })

    test('scan empty pattern', async () => {
      await backend.set('/test.txt', 'content')

      const results = await backend.scan('')
      // Empty pattern matches every line
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('batchGet/batchSet edge cases', () => {
    test('batchGet with missing files', async () => {
      await backend.set('/exists.txt', 'content')

      const results = await backend.batchGet(['/exists.txt', '/missing.txt'])
      expect(results['/exists.txt']).toBe('content')
      expect(results['/missing.txt']).toBeNull()
    })

    test('batchSet with empty object', async () => {
      await backend.batchSet({})
      // Should not throw
      expect(true).toBe(true)
    })

    test('batchSet overwrites existing files', async () => {
      await backend.set('/test.txt', 'old')
      await backend.batchSet({ '/test.txt': 'new' })

      const content = await backend.get('/test.txt')
      expect(content).toBe('new')
    })
  })
})
```

## Test Cases Summary

### Concurrent Tests
1. **Parallel writes to different files** → all succeed
2. **Parallel writes to same file** → no corruption
3. **Concurrent reads during write** → consistent results
4. **Concurrent deletes** → no errors
5. **Concurrent list operations** → consistent results
6. **Concurrent batchSet** → all batches succeed
7. **Concurrent scan** → consistent results
8. **Write-delete-write race** → final state is valid

### Edge-Case Tests
1. **Empty paths** → handled gracefully
2. **Special characters** → spaces, unicode, dots, dashes work
3. **Path normalization** → all paths start with '/'
4. **Large content** → 1MB files, empty files, many lines
5. **Scan edge cases** → no matches, special chars, empty pattern
6. **Batch operations** → missing files, empty batches, overwrites

## Verification Commands

```bash
# Run concurrent tests
npm test -- test/concurrent.test.ts

# Run edge-case tests
npm test -- test/edge-cases.test.ts

# Run all tests
npm test

# Run with coverage
npm test -- --coverage
```

## Expected Outcomes

- All tests pass across all backends
- No data corruption in concurrent scenarios
- Special characters handled correctly
- Edge cases don't crash or throw unexpected errors
- Consistent behavior across backends

## Performance Considerations

- Concurrent tests may take 5-10 seconds (intentional stress testing)
- Large file tests (1MB) may be slower on OPFS/IndexedDB
- Tests are isolated - each test gets fresh backend instance

## Dependencies

No new dependencies required. Uses existing vitest framework.
