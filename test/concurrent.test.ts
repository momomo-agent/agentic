import { describe, test } from 'node:test'
import assert from 'node:assert'
import { NodeFsBackend, AgenticStoreBackend, MemoryStorage, LocalStorageBackend } from '../dist/index.js'
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
  describe(`${name} concurrent operations`, () => {
    test('concurrent writes to different files succeed', async () => {
      const { backend, cleanup } = await create()
      try {
        const writes = Array.from({ length: 20 }, (_, i) =>
          backend.set(`/file${i}.txt`, `content ${i}`)
        )
        await Promise.all(writes)

        // Verify all files written correctly
        for (let i = 0; i < 20; i++) {
          const content = await backend.get(`/file${i}.txt`)
          assert.strictEqual(content, `content ${i}`)
        }
      } finally {
        await cleanup()
      }
    })

    test('concurrent writes to same file complete without error', async () => {
      const { backend, cleanup } = await create()
      try {
        const writes = Array.from({ length: 10 }, (_, i) =>
          backend.set('/shared.txt', `version ${i}`)
        )
        await Promise.all(writes)

        // Final content should be one of the versions (no corruption)
        const content = await backend.get('/shared.txt')
        assert.match(content!, /^version \d+$/)
      } finally {
        await cleanup()
      }
    })

    test('10 concurrent writes to same file, no corruption', async () => {
      const { backend, cleanup } = await create()
      try {
        await Promise.all(
          Array.from({ length: 10 }, (_, i) => backend.set('/race.txt', `v${i}`))
        )
        const content = await backend.get('/race.txt')
        assert.match(content!, /^v\d+$/)
      } finally {
        await cleanup()
      }
    })

    test('concurrent reads while writing', async () => {
      const { backend, cleanup } = await create()
      try {
        await backend.set('/test.txt', 'initial')

        const operations = [
          backend.set('/test.txt', 'updated'),
          backend.get('/test.txt'),
          backend.get('/test.txt'),
          backend.get('/test.txt')
        ]

        const results = await Promise.all(operations)

        // First result is set (void), rest are reads
        // Reads should return either 'initial' or 'updated' (or possibly empty during write)
        for (let i = 1; i < results.length; i++) {
          const content = results[i] as string
          assert.ok(content === 'initial' || content === 'updated' || content === '')
        }
      } finally {
        await cleanup()
      }
    })

    test('concurrent deletes of same file', async () => {
      const { backend, cleanup } = await create()
      try {
        await backend.set('/test.txt', 'content')

        const deletes = Array.from({ length: 5 }, () => backend.delete('/test.txt'))
        await Promise.all(deletes)

        // File should be deleted, no errors thrown
        const content = await backend.get('/test.txt')
        assert.strictEqual(content, null)
      } finally {
        await cleanup()
      }
    })

    test('concurrent list operations', async () => {
      const { backend, cleanup } = await create()
      try {
        await backend.set('/file1.txt', 'a')
        await backend.set('/file2.txt', 'b')
        await backend.set('/file3.txt', 'c')

        const lists = Array.from({ length: 10 }, () => backend.list())
        const results = await Promise.all(lists)

        // All list results should be identical
        results.forEach(list => {
          assert.ok(list.includes('/file1.txt'))
          assert.ok(list.includes('/file2.txt'))
          assert.ok(list.includes('/file3.txt'))
        })
      } finally {
        await cleanup()
      }
    })

    test('concurrent batchSet operations', async () => {
      const { backend, cleanup } = await create()
      try {
        const batch1 = { '/a1.txt': 'a1', '/a2.txt': 'a2' }
        const batch2 = { '/b1.txt': 'b1', '/b2.txt': 'b2' }
        const batch3 = { '/c1.txt': 'c1', '/c2.txt': 'c2' }

        await Promise.all([
          backend.batchSet(batch1),
          backend.batchSet(batch2),
          backend.batchSet(batch3)
        ])

        // Verify all files written
        assert.strictEqual(await backend.get('/a1.txt'), 'a1')
        assert.strictEqual(await backend.get('/b1.txt'), 'b1')
        assert.strictEqual(await backend.get('/c1.txt'), 'c1')
      } finally {
        await cleanup()
      }
    })

    test('concurrent scan operations', async () => {
      const { backend, cleanup } = await create()
      try {
        await backend.set('/file1.txt', 'hello world')
        await backend.set('/file2.txt', 'hello universe')
        await backend.set('/file3.txt', 'goodbye')

        const scans = Array.from({ length: 5 }, () => backend.scan('hello'))
        const results = await Promise.all(scans)

        // All scan results should be identical
        results.forEach(result => {
          assert.strictEqual(result.length, 2)
          assert.ok(result.some((r: any) => r.path === '/file1.txt'))
          assert.ok(result.some((r: any) => r.path === '/file2.txt'))
        })
      } finally {
        await cleanup()
      }
    })

    test('write-delete-write race condition', async () => {
      const { backend, cleanup } = await create()
      try {
        const operations = [
          backend.set('/test.txt', 'v1'),
          backend.delete('/test.txt'),
          backend.set('/test.txt', 'v2')
        ]

        await Promise.all(operations)

        const content = await backend.get('/test.txt')
        assert.ok(content === null || content === 'v1' || content === 'v2',
          `unexpected content: ${content}`)
      } finally {
        await cleanup()
      }
    })

    test('50 concurrent writes to same file, final value is valid', async () => {
      const { backend, cleanup } = await create()
      try {
        await Promise.all(
          Array.from({ length: 50 }, (_, i) => backend.set('/hotspot.txt', `w${i}`))
        )
        const content = await backend.get('/hotspot.txt')
        assert.match(content!, /^w\d+$/)
      } finally {
        await cleanup()
      }
    })

    test('interleaved set/get/delete on same file, no crash', async () => {
      const { backend, cleanup } = await create()
      try {
        const ops = Array.from({ length: 30 }, (_, i) => {
          if (i % 3 === 0) return backend.set('/shared2.txt', `v${i}`)
          if (i % 3 === 1) return backend.get('/shared2.txt')
          return backend.delete('/shared2.txt')
        })
        await Promise.all(ops)
      } finally {
        await cleanup()
      }
    })
  })
}
