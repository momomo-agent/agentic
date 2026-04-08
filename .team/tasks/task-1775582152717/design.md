# Design: Cross-backend consistency test suite

## File
`test/cross-backend.test.js` (extend existing file)

## Approach
Define a shared `runBackendSuite(name, makeBackend)` function that runs identical assertions against any backend. Call it for NodeFsBackend and AgenticStoreBackend. Skip OPFSBackend (browser-only, no navigator in Node).

## Suite structure
```js
async function runBackendSuite(name, makeBackend) {
  describe(`${name} consistency`, () => {
    let backend
    beforeEach(async () => { backend = await makeBackend() })

    it('write + read roundtrip', async () => {
      await backend.set('/a.txt', 'hello')
      assert.equal(await backend.get('/a.txt'), 'hello')
    })

    it('delete existing removes file', async () => {
      await backend.set('/b.txt', 'x')
      await backend.delete('/b.txt')
      assert.equal(await backend.get('/b.txt'), null)
    })

    it('delete missing is no-op', async () => {
      await assert.doesNotReject(() => backend.delete('/missing.txt'))
    })

    it('list returns paths with leading slash', async () => {
      await backend.set('/c.txt', 'y')
      const paths = await backend.list()
      assert.ok(paths.every(p => p.startsWith('/')))
    })

    it('stat returns size and isDirectory=false for file', async () => {
      await backend.set('/d.txt', 'abc')
      const s = await backend.stat?.('/d.txt')
      if (s !== undefined) {
        assert.equal(s.isDirectory, false)
        assert.ok(s.size >= 0)
      }
    })

    it('empty path throws IOError', async () => {
      await assert.rejects(() => backend.get(''), /Path cannot be empty/)
    })
  })
}
```

## Backends to test
- `NodeFsBackend` — use `os.tmpdir()` + unique subdir, cleanup in `afterEach`
- `AgenticStoreBackend` — in-memory, no cleanup needed

## Dependencies
- `node:assert`, `node:os`, `node:fs/promises`
- `NodeFsBackend` from `../src/backends/node-fs.js`
- `AgenticStoreBackend` from `../src/backends/agentic-store.js`

## Test Cases
All cases in `runBackendSuite` above, run for each backend.
