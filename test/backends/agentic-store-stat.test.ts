import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { AgenticStoreBackend } from '../../dist/index.js'

function makeStore() {
  const data = new Map<string, string>()
  return {
    async get(k: string) { return data.get(k) ?? null },
    async set(k: string, v: string) { data.set(k, v) },
    async delete(k: string) { data.delete(k) },
    async keys() { return [...data.keys()] },
    async has(k: string) { return data.has(k) },
  }
}

describe('AgenticStoreBackend.stat()', () => {
  it('returns size/mtime/isDirectory for existing file', async () => {
    const backend = new AgenticStoreBackend(makeStore())
    await backend.set('/test.txt', 'hello')
    const meta = await backend.stat('/test.txt')
    assert.ok(meta !== null)
    assert.equal(meta.size, 5)
    assert.ok(typeof meta.mtime === 'number' && meta.mtime > 0)
    assert.equal(meta.isDirectory, false)
  })

  it('throws NotFoundError for missing file', async () => {
    const backend = new AgenticStoreBackend(makeStore())
    await assert.rejects(
      () => backend.stat('/missing.txt'),
      (err: any) => err.name === 'NotFoundError'
    )
  })

  it('isDirectory is always false', async () => {
    const backend = new AgenticStoreBackend(makeStore())
    await backend.set('/file.txt', 'x')
    const meta = await backend.stat('/file.txt')
    assert.equal(meta?.isDirectory, false)
  })

  it('size matches byte length of content', async () => {
    const backend = new AgenticStoreBackend(makeStore())
    await backend.set('/unicode.txt', '你好世界') // 12 bytes UTF-8
    const meta = await backend.stat('/unicode.txt')
    assert.equal(meta?.size, 12)
  })

  it('empty string content: size = 0, not null', async () => {
    const backend = new AgenticStoreBackend(makeStore())
    await backend.set('/empty.txt', '')
    const meta = await backend.stat('/empty.txt')
    assert.ok(meta !== null)
    assert.equal(meta.size, 0)
  })
})
