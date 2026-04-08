# Task Design: Expand edge-case tests to all backends

## Objective
Extend edge-case test coverage (empty paths, special characters, concurrent writes with 10+ files) to cover OPFSBackend, MemoryStorage, and LocalStorageBackend. Currently only NodeFs and AgenticStore are covered.

## Current State
- Existing edge-case tests in test/edge-cases.test.ts (if exists) or scattered across backend tests
- Tests currently cover NodeFsBackend and AgenticStoreBackend
- OPFSBackend, MemoryBackend, and LocalStorageBackend lack comprehensive edge-case coverage
- Need to test: empty paths, special characters, concurrent writes, path normalization

## Files to Create/Modify

### 1. test/edge-cases.test.ts (create or expand)
Comprehensive edge-case test suite using parameterized tests to run against all backends.

**Structure:**
```typescript
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { NodeFsBackend } from '../src/backends/node-fs.js'
import { OPFSBackend } from '../src/backends/opfs.js'
import { AgenticStoreBackend } from '../src/backends/agentic-store.js'
import { MemoryBackend } from '../src/backends/memory.js'
import { LocalStorageBackend } from '../src/backends/local-storage.js'
import type { StorageBackend } from '../src/types.js'

// Test suite runs against all backends
describe.each([
  ['NodeFsBackend', () => new NodeFsBackend('/tmp/test-' + Date.now())],
  ['OPFSBackend', () => new OPFSBackend()],
  ['MemoryBackend', () => new MemoryBackend()],
  ['LocalStorageBackend', () => new LocalStorageBackend()],
  ['AgenticStoreBackend', () => new AgenticStoreBackend(createMockStore())]
])('%s edge cases', (name, createBackend) => {
  let backend: StorageBackend

  beforeEach(() => {
    backend = createBackend()
  })

  // Test cases here
})
```

### 2. test/concurrent.test.ts (create)
Dedicated concurrent write tests with 10+ files.

**Structure:**
```typescript
import { describe, test, expect } from 'vitest'
import type { StorageBackend } from '../src/types.js'

describe.each([
  ['NodeFsBackend', () => new NodeFsBackend('/tmp/test-' + Date.now())],
  ['OPFSBackend', () => new OPFSBackend()],
  ['MemoryBackend', () => new MemoryBackend()],
  ['LocalStorageBackend', () => new LocalStorageBackend()],
  ['AgenticStoreBackend', () => new AgenticStoreBackend(createMockStore())]
])('%s concurrent operations', (name, createBackend) => {
  // Concurrent test cases here
})
```

## Test Cases

### Empty Path Tests

```typescript
test('get with empty path returns null', async () => {
  const result = await backend.get('')
  expect(result).toBeNull()
})

test('set with empty path throws or rejects', async () => {
  await expect(backend.set('', 'content')).rejects.toThrow()
})

test('delete with empty path is no-op', async () => {
  await expect(backend.delete('')).resolves.not.toThrow()
})

test('list with empty prefix returns all files', async () => {
  await backend.set('/file1.txt', 'content1')
  await backend.set('/file2.txt', 'content2')

  const results = await backend.list('')
  expect(results.length).toBeGreaterThanOrEqual(2)
})

test('scan with empty pattern returns no results', async () => {
  await backend.set('/file.txt', 'content')
  const results = await backend.scan('')
  // Empty pattern should match nothing or everything depending on implementation
  expect(Array.isArray(results)).toBe(true)
})
```

### Special Character Tests

```typescript
test('paths with spaces', async () => {
  const path = '/file with spaces.txt'
  await backend.set(path, 'test content')
  expect(await backend.get(path)).toBe('test content')

  const files = await backend.list()
  expect(files).toContain(path)
})

test('paths with unicode characters', async () => {
  const paths = [
    '/文件.txt',
    '/файл.txt',
    '/αρχείο.txt',
    '/ファイル.txt'
  ]

  for (const path of paths) {
    await backend.set(path, 'unicode content')
    expect(await backend.get(path)).toBe('unicode content')
  }

  const files = await backend.list()
  for (const path of paths) {
    expect(files).toContain(path)
  }
})

test('paths with dots', async () => {
  const paths = [
    '/file.name.with.dots.txt',
    '/.hidden',
    '/..double',
    '/file..txt'
  ]

  for (const path of paths) {
    await backend.set(path, 'content')
    expect(await backend.get(path)).toBe('content')
  }
})

test('paths with dashes and underscores', async () => {
  const paths = [
    '/file-with-dashes.txt',
    '/file_with_underscores.txt',
    '/mixed-file_name.txt'
  ]

  for (const path of paths) {
    await backend.set(path, 'content')
    expect(await backend.get(path)).toBe('content')
  }
})

test('paths with special symbols', async () => {
  // Test symbols that should work in file paths
  const paths = [
    '/file@symbol.txt',
    '/file#hash.txt',
    '/file$dollar.txt',
    '/file&ampersand.txt'
  ]

  for (const path of paths) {
    try {
      await backend.set(path, 'content')
      const result = await backend.get(path)
      // Some backends may not support all symbols
      if (result !== null) {
        expect(result).toBe('content')
      }
    } catch (err) {
      // Some backends may reject certain characters - that's acceptable
      expect(err).toBeDefined()
    }
  }
})
```

### Path Normalization Tests

```typescript
test('all paths start with /', async () => {
  await backend.set('/normal.txt', 'content')
  await backend.set('/dir/nested.txt', 'content')

  const paths = await backend.list()
  expect(paths.every(p => p.startsWith('/'))).toBe(true)
})

test('no duplicate slashes in paths', async () => {
  await backend.set('/dir/file.txt', 'content')

  const paths = await backend.list()
  for (const path of paths) {
    expect(path).not.toMatch(/\/\//)
  }
})

test('no trailing slashes on file paths', async () => {
  await backend.set('/file.txt', 'content')

  const paths = await backend.list()
  const filePaths = paths.filter(p => !p.endsWith('/'))
  for (const path of filePaths) {
    expect(path).not.toMatch(/\/$/)
  }
})
```

### Concurrent Write Tests (10+ files)

```typescript
test('concurrent writes to different files', async () => {
  const fileCount = 20
  const writes = Array.from({ length: fileCount }, (_, i) =>
    backend.set(`/file${i}.txt`, `content ${i}`)
  )

  await Promise.all(writes)

  // Verify all files written correctly
  for (let i = 0; i < fileCount; i++) {
    const content = await backend.get(`/file${i}.txt`)
    expect(content).toBe(`content ${i}`)
  }

  // Verify list returns all files
  const files = await backend.list()
  for (let i = 0; i < fileCount; i++) {
    expect(files).toContain(`/file${i}.txt`)
  }
})

test('concurrent writes to same file', async () => {
  const writeCount = 10
  const writes = Array.from({ length: writeCount }, (_, i) =>
    backend.set('/shared.txt', `version ${i}`)
  )

  await Promise.all(writes)

  // Final content should be one of the versions (no corruption)
  const content = await backend.get('/shared.txt')
  expect(content).toMatch(/^version \d+$/)

  // Extract version number
  const version = parseInt(content!.match(/\d+/)![0])
  expect(version).toBeGreaterThanOrEqual(0)
  expect(version).toBeLessThan(writeCount)
})

test('concurrent reads and writes', async () => {
  await backend.set('/file.txt', 'initial')

  const operations = [
    ...Array.from({ length: 10 }, (_, i) => backend.set('/file.txt', `write ${i}`)),
    ...Array.from({ length: 10 }, () => backend.get('/file.txt'))
  ]

  const results = await Promise.all(operations)

  // All reads should return valid content (not corrupted)
  const reads = results.filter(r => typeof r === 'string')
  for (const content of reads) {
    expect(content).toMatch(/^(initial|write \d+)$/)
  }
})

test('concurrent deletes', async () => {
  const fileCount = 15

  // Create files
  await Promise.all(
    Array.from({ length: fileCount }, (_, i) =>
      backend.set(`/file${i}.txt`, `content ${i}`)
    )
  )

  // Delete concurrently
  await Promise.all(
    Array.from({ length: fileCount }, (_, i) =>
      backend.delete(`/file${i}.txt`)
    )
  )

  // Verify all deleted
  for (let i = 0; i < fileCount; i++) {
    const content = await backend.get(`/file${i}.txt`)
    expect(content).toBeNull()
  }

  // List should be empty (or not contain deleted files)
  const files = await backend.list()
  for (let i = 0; i < fileCount; i++) {
    expect(files).not.toContain(`/file${i}.txt`)
  }
})

test('concurrent batch operations', async () => {
  const batch1 = Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [`/batch1-${i}.txt`, `content ${i}`])
  )
  const batch2 = Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [`/batch2-${i}.txt`, `content ${i}`])
  )

  await Promise.all([
    backend.batchSet(batch1),
    backend.batchSet(batch2)
  ])

  // Verify all files written
  const allPaths = [...Object.keys(batch1), ...Object.keys(batch2)]
  const results = await backend.batchGet(allPaths)

  for (const [path, content] of Object.entries(results)) {
    expect(content).toMatch(/^content \d+$/)
  }
})
```

### Large File Tests

```typescript
test('handles large file content', async () => {
  const largeContent = 'x'.repeat(1024 * 1024) // 1MB
  await backend.set('/large.txt', largeContent)

  const retrieved = await backend.get('/large.txt')
  expect(retrieved).toBe(largeContent)
  expect(retrieved!.length).toBe(1024 * 1024)
})

test('handles many small files', async () => {
  const fileCount = 100

  await Promise.all(
    Array.from({ length: fileCount }, (_, i) =>
      backend.set(`/small${i}.txt`, `content ${i}`)
    )
  )

  const files = await backend.list()
  expect(files.length).toBeGreaterThanOrEqual(fileCount)
})
```

### Boundary Condition Tests

```typescript
test('empty file content', async () => {
  await backend.set('/empty.txt', '')
  const content = await backend.get('/empty.txt')
  expect(content).toBe('')
})

test('very long path', async () => {
  const longPath = '/' + 'a'.repeat(200) + '.txt'

  try {
    await backend.set(longPath, 'content')
    const content = await backend.get(longPath)
    // Some backends may support, others may not
    if (content !== null) {
      expect(content).toBe('content')
    }
  } catch (err) {
    // Path too long is acceptable error
    expect(err).toBeDefined()
  }
})

test('deeply nested paths', async () => {
  const deepPath = '/' + Array.from({ length: 20 }, (_, i) => `dir${i}`).join('/') + '/file.txt'

  await backend.set(deepPath, 'deep content')
  const content = await backend.get(deepPath)
  expect(content).toBe('deep content')

  const files = await backend.list()
  expect(files).toContain(deepPath)
})
```

## Algorithm

### Test Execution Flow
1. Use vitest's `describe.each()` to parameterize tests across all backends
2. Create fresh backend instance for each test via `beforeEach()`
3. Run identical test cases against each backend
4. Assert consistent behavior across all backends
5. Allow backend-specific failures where documented (e.g., path length limits)

### Backend Factory Pattern
```typescript
function createMockStore() {
  const store = new Map()
  return {
    async get(key: string) { return store.get(key) ?? null },
    async set(key: string, value: any) { store.set(key, value) },
    async delete(key: string) { store.delete(key) },
    async keys() { return Array.from(store.keys()) },
    async has(key: string) { return store.has(key) }
  }
}

const backendFactories = {
  NodeFsBackend: () => new NodeFsBackend('/tmp/test-' + Date.now()),
  OPFSBackend: () => new OPFSBackend(),
  MemoryBackend: () => new MemoryBackend(),
  LocalStorageBackend: () => new LocalStorageBackend(),
  AgenticStoreBackend: () => new AgenticStoreBackend(createMockStore())
}
```

## Edge Cases

### Backend-Specific Limitations
- **LocalStorageBackend**: 5-10MB storage limit, may fail on large files
- **OPFSBackend**: Requires HTTPS or localhost, may not work in all test environments
- **NodeFsBackend**: Path length limits vary by OS (255 chars on most systems)
- **MemoryBackend**: No persistence, unlimited size (until RAM exhausted)
- **AgenticStoreBackend**: IndexedDB quota limits (~50MB typical)

### Test Environment Considerations
- OPFS tests may need to run in browser environment (use vitest browser mode or skip)
- LocalStorage tests need DOM environment (use jsdom or skip)
- Concurrent tests may be slow (10-30 seconds per backend)
- Large file tests may consume significant memory

## Error Handling

- Tests should use `expect().rejects.toThrow()` for expected errors
- Tests should use `try/catch` for backend-specific limitations
- Tests should not fail if backend legitimately doesn't support a feature
- Tests should log warnings for skipped tests due to environment limitations

## Dependencies

- vitest: Test framework (already in project)
- No new production dependencies
- May need jsdom for LocalStorage tests in Node environment

## Test Configuration

Add to vitest.config.ts (if needed):

```typescript
export default defineConfig({
  test: {
    environment: 'jsdom', // For LocalStorage tests
    testTimeout: 30000, // Longer timeout for concurrent tests
    hookTimeout: 10000,
    teardownTimeout: 10000
  }
})
```

## Verification

```bash
# Run all edge-case tests
npm test -- test/edge-cases.test.ts

# Run concurrent tests
npm test -- test/concurrent.test.ts

# Run specific backend tests
npm test -- test/edge-cases.test.ts -t "NodeFsBackend"
npm test -- test/edge-cases.test.ts -t "OPFSBackend"
npm test -- test/edge-cases.test.ts -t "MemoryBackend"

# Run with coverage
npm test -- --coverage test/edge-cases.test.ts

# Check test count
npm test -- test/edge-cases.test.ts --reporter=verbose | grep -c "✓"
```

## Performance Considerations

- Concurrent tests with 20 files may take 5-10 seconds per backend
- Total test suite may take 2-5 minutes to run all backends
- Consider using `test.concurrent()` for independent tests
- Consider using `test.skip()` for slow tests in CI environments
- Large file tests (1MB+) may be slow on IndexedDB backends

## Success Criteria

- All 5 backends pass identical edge-case tests
- Test coverage ≥ 90% for edge cases
- No test failures due to backend inconsistencies
- Tests complete in < 5 minutes total
- Clear documentation of backend-specific limitations

## Notes

- Some tests may need to be skipped for specific backends (document with comments)
- OPFS tests may require browser environment - consider using `@vitest/browser`
- LocalStorage tests need DOM - use jsdom or skip in pure Node environment
- Concurrent tests are inherently non-deterministic - test for correctness, not specific outcomes
- Consider adding performance benchmarks in separate test file
