# Task Design: Fix AgenticStoreBackend scan/list normalization

## Objective
Verify that AgenticStoreBackend.scan() and list() return paths with '/' prefix, consistent with NodeFsBackend and OPFSBackend. Write tests to confirm behavior.

## Current State Analysis

### AgenticStoreBackend Implementation (src/backends/agentic-store.ts)

**list() - Line 33-38:**
```typescript
async list(prefix?: string): Promise<string[]> {
  const keys = await this.store.keys()
  const normalized = keys.map(k => k.startsWith('/') ? k : '/' + k)
  if (!prefix) return normalized
  return normalized.filter(k => k.startsWith(prefix))
}
```
✅ Already normalizes paths with '/' prefix

**scanStream() - Line 49-59:**
```typescript
async *scanStream(pattern: string): AsyncIterable<{ path: string; line: number; content: string }> {
  for (const key of await this.store.keys()) {
    const normalized = key.startsWith('/') ? key : '/' + key
    const value = await this.store.get(key)
    if (typeof value !== 'string') continue
    const lines = value.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(pattern)) yield { path: normalized, line: i + 1, content: lines[i] }
    }
  }
}
```
✅ Already normalizes paths with '/' prefix

**scan() - Line 61-65:**
```typescript
async scan(pattern: string): Promise<Array<{ path: string; line: number; content: string }>> {
  const results: Array<{ path: string; line: number; content: string }> = []
  for await (const r of this.scanStream(pattern)) results.push(r)
  return results
}
```
✅ Wraps scanStream(), inherits normalization

## Conclusion
**No code changes needed.** Implementation is already correct. This task is verification-only.

## Files to Create

### test/backends/agentic-store-normalization.test.ts

```typescript
import { describe, test, expect, beforeEach } from 'vitest'
import { AgenticStoreBackend } from '../../src/backends/agentic-store.js'

// Mock AgenticStore implementation
class MockAgenticStore {
  private data = new Map<string, string>()

  async get(key: string): Promise<string | null> {
    return this.data.get(key) ?? null
  }

  async set(key: string, value: string): Promise<void> {
    this.data.set(key, value)
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key)
  }

  async keys(): Promise<string[]> {
    return Array.from(this.data.keys())
  }

  async has(key: string): Promise<boolean> {
    return this.data.has(key)
  }
}

describe('AgenticStoreBackend path normalization', () => {
  let store: MockAgenticStore
  let backend: AgenticStoreBackend

  beforeEach(() => {
    store = new MockAgenticStore()
    backend = new AgenticStoreBackend(store)
  })

  describe('list() normalization', () => {
    test('normalizes paths without leading slash', async () => {
      // Store keys without leading slash
      await store.set('file1.txt', 'content1')
      await store.set('dir/file2.txt', 'content2')

      const paths = await backend.list()

      expect(paths).toEqual(['/file1.txt', '/dir/file2.txt'])
      expect(paths.every(p => p.startsWith('/'))).toBe(true)
    })

    test('preserves paths with leading slash', async () => {
      await store.set('/file1.txt', 'content1')
      await store.set('/dir/file2.txt', 'content2')

      const paths = await backend.list()

      expect(paths).toEqual(['/file1.txt', '/dir/file2.txt'])
      expect(paths.every(p => p.startsWith('/'))).toBe(true)
    })

    test('handles mixed path formats', async () => {
      await store.set('file1.txt', 'content1')
      await store.set('/file2.txt', 'content2')
      await store.set('dir/file3.txt', 'content3')
      await store.set('/dir/file4.txt', 'content4')

      const paths = await backend.list()

      expect(paths).toContain('/file1.txt')
      expect(paths).toContain('/file2.txt')
      expect(paths).toContain('/dir/file3.txt')
      expect(paths).toContain('/dir/file4.txt')
      expect(paths.every(p => p.startsWith('/'))).toBe(true)
    })

    test('prefix filtering works with normalized paths', async () => {
      await store.set('file1.txt', 'content1')
      await store.set('dir/file2.txt', 'content2')
      await store.set('other/file3.txt', 'content3')

      const paths = await backend.list('/dir')

      expect(paths).toEqual(['/dir/file2.txt'])
    })
  })

  describe('scan() normalization', () => {
    test('returns normalized paths in scan results', async () => {
      await store.set('file1.txt', 'hello world')
      await store.set('dir/file2.txt', 'hello universe')

      const results = await backend.scan('hello')

      expect(results).toHaveLength(2)
      expect(results[0].path).toBe('/file1.txt')
      expect(results[1].path).toBe('/dir/file2.txt')
      expect(results.every(r => r.path.startsWith('/'))).toBe(true)
    })

    test('scan result structure matches interface', async () => {
      await store.set('test.txt', 'line 1\nline 2 match\nline 3')

      const results = await backend.scan('match')

      expect(results).toHaveLength(1)
      expect(results[0]).toEqual({
        path: '/test.txt',
        line: 2,
        content: 'line 2 match'
      })
    })
  })

  describe('scanStream() normalization', () => {
    test('yields normalized paths', async () => {
      await store.set('file1.txt', 'hello world')
      await store.set('dir/file2.txt', 'hello universe')

      const results: Array<{ path: string; line: number; content: string }> = []
      for await (const result of backend.scanStream('hello')) {
        results.push(result)
      }

      expect(results).toHaveLength(2)
      expect(results[0].path).toBe('/file1.txt')
      expect(results[1].path).toBe('/dir/file2.txt')
      expect(results.every(r => r.path.startsWith('/'))).toBe(true)
    })
  })

  describe('cross-backend consistency', () => {
    test('list() format matches NodeFsBackend pattern', async () => {
      await store.set('file.txt', 'content')
      await store.set('dir/nested.txt', 'content')

      const paths = await backend.list()

      // All paths should start with / and use / as separator
      expect(paths.every(p => p.startsWith('/'))).toBe(true)
      expect(paths.every(p => !p.includes('\\'))).toBe(true)
    })

    test('scan() format matches NodeFsBackend pattern', async () => {
      await store.set('test.txt', 'match here')

      const results = await backend.scan('match')

      expect(results[0]).toMatchObject({
        path: expect.stringMatching(/^\/.*\.txt$/),
        line: expect.any(Number),
        content: expect.any(String)
      })
    })
  })
})
```

## Test Cases

### Verification Tests
1. **list() with unnormalized keys** → returns paths with '/' prefix
2. **list() with normalized keys** → preserves '/' prefix
3. **list() with mixed formats** → all results have '/' prefix
4. **scan() results** → all paths have '/' prefix
5. **scanStream() results** → all paths have '/' prefix
6. **Cross-backend consistency** → format matches NodeFsBackend/OPFSBackend

## Verification Commands

```bash
# Run normalization tests
npm test -- test/backends/agentic-store-normalization.test.ts

# Run all backend tests to verify consistency
npm test -- test/backends/

# Verify scan/list behavior manually
node -e "
import { AgenticStoreBackend } from './src/backends/agentic-store.js';
const store = {
  data: new Map([['file.txt', 'hello'], ['dir/nested.txt', 'world']]),
  async get(k) { return this.data.get(k) ?? null },
  async set(k, v) { this.data.set(k, v) },
  async delete(k) { this.data.delete(k) },
  async keys() { return Array.from(this.data.keys()) },
  async has(k) { return this.data.has(k) }
};
const backend = new AgenticStoreBackend(store);
console.log('list():', await backend.list());
console.log('scan():', await backend.scan('hello'));
"
```

## Expected Outcomes

All tests pass, confirming:
- ✅ list() returns paths with '/' prefix
- ✅ scan() returns {path, line, content}[] with normalized paths
- ✅ scanStream() yields normalized paths
- ✅ Behavior consistent with NodeFsBackend and OPFSBackend

## Performance Impact

No performance impact - no code changes, verification only.

## Dependencies

No new dependencies required.
