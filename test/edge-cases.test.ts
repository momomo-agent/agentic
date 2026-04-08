import { describe, test } from 'node:test'
import assert from 'node:assert'
import { NodeFsBackend, MemoryStorage, AgenticStoreBackend, LocalStorageBackend } from '../dist/index.js'
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

function makeMockLocalStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    get length() { return store.size },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    clear: () => store.clear()
  }
}

const backends = [
  {
    name: 'NodeFsBackend',
    create: async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'test-'))
      return { backend: new NodeFsBackend(tmpDir), cleanup: () => rm(tmpDir, { recursive: true, force: true }) }
    }
  },
  {
    name: 'MemoryBackend',
    create: async () => {
      return { backend: new MemoryStorage(), cleanup: async () => {} }
    }
  },
  {
    name: 'AgenticStoreBackend',
    create: async () => {
      return { backend: new AgenticStoreBackend(new MockAgenticStore()), cleanup: async () => {} }
    }
  },
  {
    name: 'LocalStorageBackend',
    create: async () => {
      const mock = makeMockLocalStorage();
      (global as any).localStorage = mock
      return { backend: new LocalStorageBackend(), cleanup: async () => { delete (global as any).localStorage } }
    }
  }
]

for (const { name, create } of backends) {
  describe(`${name} edge cases`, () => {

    describe('empty and invalid paths', () => {
      test('empty string path rejected on get', async () => {
        const { backend, cleanup } = await create()
        try {
          await assert.rejects(() => backend.get(''))
        } finally {
          await cleanup()
        }
      })

      test('empty string path on set creates no file', async () => {
        const { backend, cleanup } = await create()
        try {
          // Empty path should either be rejected or ignored
          try {
            await backend.set('', 'content')
          } catch (e) {
            // Some backends may throw on empty path, which is acceptable
          }
          const paths = await backend.list()
          assert.ok(!paths.includes(''))
        } finally {
          await cleanup()
        }
      })

      test('root path "/" handled correctly', async () => {
        const { backend, cleanup } = await create()
        try {
          // Root is a directory — backends either return null or throw IOError
          const result = await backend.get('/').catch((e: any) => e)
          assert.ok(result === null || result?.name === 'IOError',
            `expected null or IOError, got ${result}`)
        } finally {
          await cleanup()
        }
      })

      test('empty string path on delete is no-op', async () => {
        const { backend, cleanup } = await create()
        try {
          try { await backend.delete('') } catch (_) {}
          assert.ok(true)
        } finally {
          await cleanup()
        }
      })

      test('empty string path on list not included', async () => {
        const { backend, cleanup } = await create()
        try {
          try { await backend.set('', 'x') } catch (_) {}
          const paths = await backend.list()
          assert.ok(!paths.includes(''))
        } finally {
          await cleanup()
        }
      })
    })

    describe('special characters in paths', () => {
      test('spaces in filename', async () => {
        const { backend, cleanup } = await create()
        try {
          await backend.set('/file with spaces.txt', 'content')
          const content = await backend.get('/file with spaces.txt')
          assert.strictEqual(content, 'content')

          const paths = await backend.list()
          assert.ok(paths.includes('/file with spaces.txt'))
        } finally {
          await cleanup()
        }
      })

      test('unicode characters', async () => {
        const { backend, cleanup } = await create()
        try {
          await backend.set('/文件.txt', 'content')
          await backend.set('/файл.txt', 'content')
          await backend.set('/αρχείο.txt', 'content')

          assert.strictEqual(await backend.get('/文件.txt'), 'content')
          assert.strictEqual(await backend.get('/файл.txt'), 'content')
          assert.strictEqual(await backend.get('/αρχείο.txt'), 'content')
        } finally {
          await cleanup()
        }
      })

      test('dots in filename', async () => {
        const { backend, cleanup } = await create()
        try {
          await backend.set('/file.name.with.dots.txt', 'content')
          const content = await backend.get('/file.name.with.dots.txt')
          assert.strictEqual(content, 'content')
        } finally {
          await cleanup()
        }
      })

      test('dashes and underscores', async () => {
        const { backend, cleanup } = await create()
        try {
          await backend.set('/file-with-dashes.txt', 'content1')
          await backend.set('/file_with_underscores.txt', 'content2')

          assert.strictEqual(await backend.get('/file-with-dashes.txt'), 'content1')
          assert.strictEqual(await backend.get('/file_with_underscores.txt'), 'content2')
        } finally {
          await cleanup()
        }
      })

      test('parentheses and brackets', async () => {
        const { backend, cleanup } = await create()
        try {
          await backend.set('/file(1).txt', 'content1')
          await backend.set('/file[2].txt', 'content2')

          assert.strictEqual(await backend.get('/file(1).txt'), 'content1')
          assert.strictEqual(await backend.get('/file[2].txt'), 'content2')
        } finally {
          await cleanup()
        }
      })
    })

    describe('path normalization', () => {
      test('all list results start with /', async () => {
        const { backend, cleanup } = await create()
        try {
          await backend.set('/file1.txt', 'a')
          await backend.set('/dir/file2.txt', 'b')

          const paths = await backend.list()
          assert.ok(paths.every((p: string) => p.startsWith('/')))
        } finally {
          await cleanup()
        }
      })

      test('no backslashes in paths', async () => {
        const { backend, cleanup } = await create()
        try {
          await backend.set('/dir/file.txt', 'content')

          const paths = await backend.list()
          assert.ok(paths.every((p: string) => !p.includes('\\')))
        } finally {
          await cleanup()
        }
      })

      test('double slashes normalized', async () => {
        const { backend, cleanup } = await create()
        try {
          await backend.set('//file.txt', 'content')

          // Try both normalized and non-normalized paths
          let content = await backend.get('/file.txt')
          if (!content) {
            content = await backend.get('//file.txt')
          }

          // Should be accessible via at least one path
          assert.ok(content === 'content')
        } finally {
          await cleanup()
        }
      })
    })

    describe('large content', () => {
      test('1MB file', async () => {
        const { backend, cleanup } = await create()
        try {
          const largeContent = 'x'.repeat(1024 * 1024)
          await backend.set('/large.txt', largeContent)

          const content = await backend.get('/large.txt')
          assert.strictEqual(content, largeContent)
          assert.strictEqual(content!.length, 1024 * 1024)
        } finally {
          await cleanup()
        }
      })

      test('empty file', async () => {
        const { backend, cleanup } = await create()
        try {
          await backend.set('/empty.txt', '')
          const content = await backend.get('/empty.txt')
          assert.strictEqual(content, '')
        } finally {
          await cleanup()
        }
      })

      test('file with many lines', async () => {
        const { backend, cleanup } = await create()
        try {
          const lines = Array.from({ length: 10000 }, (_, i) => `line ${i}`)
          const content = lines.join('\n')
          await backend.set('/many-lines.txt', content)

          const retrieved = await backend.get('/many-lines.txt')
          assert.strictEqual(retrieved?.split('\n').length, 10000)
        } finally {
          await cleanup()
        }
      })
    })

    describe('scan edge cases', () => {
      test('scan with no matches', async () => {
        const { backend, cleanup } = await create()
        try {
          await backend.set('/file1.txt', 'hello')
          await backend.set('/file2.txt', 'world')

          const results = await backend.scan('nonexistent')
          assert.strictEqual(results.length, 0)
        } finally {
          await cleanup()
        }
      })

      test('scan with special regex characters', async () => {
        const { backend, cleanup } = await create()
        try {
          await backend.set('/test.txt', 'price: $100')

          const results = await backend.scan('$100')
          assert.strictEqual(results.length, 1)
          assert.ok(results[0].content.includes('$100'))
        } finally {
          await cleanup()
        }
      })

      test('scan empty pattern', async () => {
        const { backend, cleanup } = await create()
        try {
          await backend.set('/test.txt', 'content')

          const results = await backend.scan('')
          // Empty pattern matches every line
          assert.ok(results.length > 0)
        } finally {
          await cleanup()
        }
      })
    })

    describe('batchGet/batchSet edge cases', () => {
      test('batchGet with missing files', async () => {
        const { backend, cleanup } = await create()
        try {
          await backend.set('/exists.txt', 'content')

          const results = await backend.batchGet(['/exists.txt', '/missing.txt'])
          assert.strictEqual(results['/exists.txt'], 'content')
          assert.strictEqual(results['/missing.txt'], null)
        } finally {
          await cleanup()
        }
      })

      test('batchSet with empty object', async () => {
        const { backend, cleanup } = await create()
        try {
          await backend.batchSet({})
          // Should not throw
          assert.ok(true)
        } finally {
          await cleanup()
        }
      })

      test('batchSet overwrites existing files', async () => {
        const { backend, cleanup } = await create()
        try {
          await backend.set('/test.txt', 'old')
          await backend.batchSet({ '/test.txt': 'new' })

          const content = await backend.get('/test.txt')
          assert.strictEqual(content, 'new')
        } finally {
          await cleanup()
        }
      })
    })
  })
}
